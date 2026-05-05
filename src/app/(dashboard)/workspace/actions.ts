"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { 
  sendTaskNotification, 
  sendTaskUpdateNotification, 
  sendTaskAssignmentNotification, 
  sendTaskReplyNotification 
} from "@/lib/email";

import { getUserPermissions } from "@/lib/permissions-server";
import { hasPermission, RESOURCES } from "@/lib/permissions";

export async function getWorkspaces() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  const userId = userData.user.id;

  // Check permissions dynamically instead of hardcoded admin check
  const permissions = await getUserPermissions(userId);
  const canReadAll = hasPermission(permissions, RESOURCES.WORKSPACE, "read") || 
                     hasPermission(permissions, "module_workspace", "read") ||
                     hasPermission(permissions, "*", "manage");

  if (canReadAll) {
    // Users with global workspace read permission see all workspaces
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from("workspaces")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  }

  // For users without global read, let Supabase RLS handle visibility automatically.
  // This ensures we respect the complex assignment-based visibility defined in our SQL.
  const { data, error } = await supabase
    .from("workspaces")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

export async function createWorkspace(data: { name: string; description?: string }) {
  const supabase = await createClient();
  
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error("Unauthorized");

  // Enforce dynamic permission check for creation
  const permissions = await getUserPermissions(userData.user.id);
  if (!hasPermission(permissions, RESOURCES.WORKSPACE, "create") && 
      !hasPermission(permissions, "*", "manage")) {
    throw new Error("Insufficient permissions to create workspaces");
  }

  const { data: workspace, error } = await supabase
    .from("workspaces")
    .insert([{ ...data, created_by: userData.user.id }])
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Add creator as owner using admin client to bypass initial RLS chicken-and-egg
  const adminClient = createAdminClient();
  const { error: memberError } = await adminClient.from("workspace_members").insert([
    { workspace_id: workspace.id, profile_id: userData.user.id, role: 'owner' }
  ]);

  if (memberError) {
    // Rollback workspace creation if member insertion fails
    await adminClient.from("workspaces").delete().eq("id", workspace.id);
    throw new Error("Failed to initialize workspace owner: " + memberError.message);
  }

  revalidatePath("/workspace");
  return workspace;
}

export async function getProjects(workspaceId: string) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  // Fetch projects where user is a member OR has an assigned task
  const { data, error } = await supabase
    .from("workspace_projects")
    .select(`
      *,
      tasks:tasks(
        id,
        task_assignees(profile_id)
      )
    `)
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return data || [];
}

export async function createProject(workspaceId: string, data: { name: string; description?: string; status?: string }) {
  const supabase = await createClient();
  
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  const { data: project, error } = await supabase
    .from("workspace_projects")
    .insert([{ ...data, workspace_id: workspaceId, created_by: userData.user.id }])
    .select()
    .single();

  if (error) throw new Error(error.message);

  revalidatePath(`/workspace/${workspaceId}`);
  return project;
}

export async function getTasks(projectId: string) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  const permissions = await getUserPermissions(userData.user.id);
  const canReadAll = hasPermission(permissions, RESOURCES.WORKSPACE, "read") || 
                     hasPermission(permissions, "*", "manage");

  const queryClient = canReadAll ? createAdminClient() : supabase;

  const { data, error } = await queryClient
    .from("tasks")
    .select("*, task_assignees(profile_id, profiles(full_name, avatar_url))")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

export async function createTask(projectId: string, taskData: any) {
  const supabase = await createClient();
  
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  const { assignees, ...restData } = taskData;

  const { data: task, error } = await supabase
    .from("tasks")
    .insert([{ ...restData, project_id: projectId, created_by: userData.user.id }])
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Insert assignees if any
  if (assignees && assignees.length > 0) {
    const assigneeInserts = assignees.map((profile_id: string) => ({
      task_id: task.id,
      profile_id
    }));
    await supabase.from("task_assignees").insert(assigneeInserts);

    // Auto-enroll assignees as workspace members so they can see the workspace
    try {
      const adminClient = createAdminClient();
      const { data: projectData } = await adminClient
        .from("workspace_projects")
        .select("workspace_id")
        .eq("id", projectId)
        .single();
      
      if (projectData?.workspace_id) {
        const memberInserts = assignees.map((profile_id: string) => ({
          workspace_id: projectData.workspace_id,
          profile_id,
          role: 'member'
        }));
        await adminClient.from("workspace_members").upsert(memberInserts, { onConflict: 'workspace_id,profile_id', ignoreDuplicates: true });
      }
    } catch (err) {
      console.warn("Failed to auto-enroll assignees as workspace members:", err);
    }
  }

  // Log activity
  await supabase.from("task_activity_logs").insert([{
    task_id: task.id,
    action_type: 'task_created',
    created_by: userData.user.id,
    metadata: { title: task.title }
  }]);

  revalidatePath(`/workspace`); // Need precise revalidation

  // Background Notifications
  (async () => {
    try {
      // Send creation email to creator
      if (userData.user.email) {
        await sendTaskNotification(userData.user.email, task.title, task.description || "No description provided");
      }

      // Send assignment emails and in-app notifications
      if (assignees && assignees.length > 0) {
        const { data: assigneeProfiles } = await supabase
          .from("profiles")
          .select("id, email")
          .in("id", assignees);
        
        if (assigneeProfiles) {
          // In-app notifications (Bell Icon - General Alerts)
          const generalNotifications = assigneeProfiles.map(ap => ({
            task_id: task.id,
            user_id: ap.id,
            message: `You have been assigned to a new task: ${task.title}`
          }));
          await supabase.from("ticket_notifications").insert(generalNotifications);

          // In-app notifications (Message Icon - Specific Task Activity)
          const taskNotifications = assigneeProfiles.map(ap => ({
            task_id: task.id,
            profile_id: ap.id,
            message: `New Task Assignment: ${task.title}`
          }));
          await supabase.from("task_notifications").insert(taskNotifications);

          // Emails
          for (const profile of assigneeProfiles) {
            if (profile.email) {
              await sendTaskAssignmentNotification(profile.email, task.title);
            }
          }
        }
      }
    } catch (err) {
      console.warn("Failed to send task creation notifications:", err);
    }
  })();

  return task;
}

export async function updateTaskStatus(taskId: string, status: string, resolutionNote?: string) {
  const supabase = await createClient();
  
  const { data: userData } = await supabase.auth.getUser();
  if (!userData || !userData.user) throw new Error("Unauthorized");

  // Check if user is admin/manager to bypass RLS if needed
  const permissions = await getUserPermissions(userData.user.id);
  const resourceNames = [RESOURCES.WORKSPACE, "module_workspace", "workspace_tasks", "tasks", "workspace"];
  const canUpdate = permissions.some(p => 
    resourceNames.includes(p.resource) && (p.action === 'update' || p.action === 'manage' || p.action === '*')
  ) || hasPermission(permissions, "*", "manage");

  const queryClient = canUpdate ? createAdminClient() : supabase;

  const updates: any = { status };
  if (resolutionNote) {
    updates.resolution_note = resolutionNote;
  }

  const { data: task, error } = await queryClient
    .from("tasks")
    .update(updates)
    .eq("id", taskId)
    .select()
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!task) throw new Error("Task not found or insufficient permissions to update");

  // Log activity
  await supabase.from("task_activity_logs").insert([{
    task_id: taskId,
    action_type: status === 'COMPLETE' ? 'task_resolved' : 'status_changed',
    created_by: userData.user.id,
    metadata: { 
      new_status: status,
      resolution_note: resolutionNote 
    }
  }]);

  // Background Notifications
  (async () => {
    try {
      const adminClient = createAdminClient();
      const { data: taskDetails } = await adminClient
        .from("tasks")
        .select(`
          title, 
          created_by, 
          project_id,
          workspace_projects(workspace_id),
          task_assignees(profile_id)
        `)
        .eq("id", taskId)
        .maybeSingle();
      
      if (taskDetails) {
        const recipientIds = new Set<string>();
        taskDetails.task_assignees?.forEach((ta: any) => recipientIds.add(ta.profile_id));
        recipientIds.add(taskDetails.created_by);
        recipientIds.delete(userData.user.id);

        if (recipientIds.size > 0) {
          const wp = taskDetails.workspace_projects as any;
          const workspaceId = Array.isArray(wp) ? wp[0]?.workspace_id : wp?.workspace_id;
          const link = workspaceId ? `/workspace/${workspaceId}/project/${taskDetails.project_id}/task/${taskId}` : null;

          const notifications = Array.from(recipientIds).map(pid => ({
            user_id: pid,
            title: "Task Activity",
            message: status === 'COMPLETE' 
              ? `Task Resolved: ${taskDetails.title}. Note: ${resolutionNote || 'No note'}`
              : `Task Status Updated: ${taskDetails.title} is now ${status}`,
            type: "task_update",
            link: link
          }));
          await adminClient.from("notifications").insert(notifications);
        }
      }
    } catch (err) {
      console.warn("Failed to send status update notifications:", err);
    }
  })();

  revalidatePath("/workspace");
  revalidatePath("/dashboard");
  return task;
}

export async function updateTaskField(taskId: string, field: string, value: any) {
  const supabase = await createClient();
  
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  const allowedFields = ["title", "description", "priority", "due_date"];
  if (!allowedFields.includes(field)) {
    throw new Error("Invalid field to update");
  }

  // Check if user is admin/manager to bypass RLS if needed
  const permissions = await getUserPermissions(userData.user.id);
  const resourceNames = [RESOURCES.WORKSPACE, "module_workspace", "workspace_tasks", "tasks", "workspace"];
  const canUpdate = permissions.some(p => 
    resourceNames.includes(p.resource) && (p.action === 'update' || p.action === 'manage' || p.action === '*')
  ) || hasPermission(permissions, "*", "manage");

  const queryClient = canUpdate ? createAdminClient() : supabase;

  const { data: task, error } = await queryClient
    .from("tasks")
    .update({ [field]: value })
    .eq("id", taskId)
    .select()
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!task) {
    const permSummary = permissions.slice(0, 10).map(p => `${p.resource}:${p.action}`).join(', ');
    throw new Error(`Insufficient permissions or task not found. (Perms: ${permSummary}${permissions.length > 10 ? '...' : ''})`);
  }

  // Background Notifications
  (async () => {
    try {
      const adminClient = createAdminClient();
      const { data: taskDetails } = await adminClient
        .from("tasks")
        .select(`
          title, 
          created_by, 
          project_id,
          workspace_projects(workspace_id),
          task_assignees(profile_id)
        `)
        .eq("id", taskId)
        .maybeSingle();
      
      if (taskDetails) {
        const recipientIds = new Set<string>();
        taskDetails.task_assignees?.forEach((ta: any) => recipientIds.add(ta.profile_id));
        recipientIds.add(taskDetails.created_by);
        recipientIds.delete(userData.user.id);

        if (recipientIds.size > 0) {
          const wp = taskDetails.workspace_projects as any;
          const workspaceId = Array.isArray(wp) ? wp[0]?.workspace_id : wp?.workspace_id;
          const link = workspaceId ? `/workspace/${workspaceId}/project/${taskDetails.project_id}/task/${taskId}` : null;

          const notifications = Array.from(recipientIds).map(pid => ({
            user_id: pid,
            title: "Task Modified",
            message: `Task Updated: ${taskDetails.title} (${field} changed to ${value})`,
            type: "task_update",
            link: link
          }));
          await adminClient.from("notifications").insert(notifications);
        }
      }
    } catch (err) {
      console.warn("Failed to send field update notifications:", err);
    }
  })();

  revalidatePath("/workspace");
  revalidatePath("/dashboard");
  return task;
}

export async function updateTaskFull(taskId: string, updates: any) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData || !userData.user) throw new Error("Unauthorized");

  // Check if user is admin/manager to bypass RLS if needed
  const permissions = await getUserPermissions(userData.user.id);
  const resourceNames = [RESOURCES.WORKSPACE, "module_workspace", "workspace_tasks", "tasks", "workspace"];
  const canUpdate = permissions.some(p => 
    resourceNames.includes(p.resource) && (p.action === 'update' || p.action === 'manage' || p.action === '*')
  ) || hasPermission(permissions, "*", "manage");

  const queryClient = canUpdate ? createAdminClient() : supabase;

  const { data: task, error } = await queryClient
    .from("tasks")
    .update(updates)
    .eq("id", taskId)
    .select()
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!task) {
    const permSummary = permissions.slice(0, 10).map(p => `${p.resource}:${p.action}`).join(', ');
    throw new Error(`Insufficient permissions or task not found. (Perms: ${permSummary}${permissions.length > 10 ? '...' : ''})`);
  }

  // Log activity
  await supabase.from("task_activity_logs").insert([{
    task_id: taskId,
    action_type: 'task_updated',
    created_by: userData.user.id,
    metadata: { updates }
  }]);

  // Background Notifications
  (async () => {
    try {
      const adminClient = createAdminClient();
      const { data: taskDetails } = await adminClient
        .from("tasks")
        .select(`
          title, 
          created_by, 
          project_id,
          workspace_projects(workspace_id),
          task_assignees(profile_id, profiles(email, id))
        `)
        .eq("id", taskId)
        .single();
      
      if (taskDetails) {
        const recipients = new Set<string>();
        const recipientIds = new Set<string>();
 
        taskDetails.task_assignees?.forEach((ta: any) => {
          if (ta.profiles?.email) recipients.add(ta.profiles.email);
          if (ta.profiles?.id || ta.profile_id) recipientIds.add(ta.profiles?.id || ta.profile_id);
        });
 
        const { data: creator } = await adminClient.from("profiles").select("email, id").eq("id", taskDetails.created_by).single();
        if (creator?.email) recipients.add(creator.email);
        if (creator?.id) recipientIds.add(creator.id);
 
        recipients.delete(userData.user.email!);
        recipientIds.delete(userData.user.id);
 
        for (const email of recipients) {
          await sendTaskUpdateNotification(email, taskDetails.title, "Updated", "Multiple task parameters were updated.");
        }
 
        if (recipientIds.size > 0) {
          const wp = taskDetails.workspace_projects as any;
          const workspaceId = Array.isArray(wp) ? wp[0]?.workspace_id : wp?.workspace_id;
          const link = workspaceId ? `/workspace/${workspaceId}/project/${taskDetails.project_id}/task/${taskId}` : null;

          const notifications = Array.from(recipientIds).map(pid => ({
            user_id: pid,
            title: "Task Update",
            message: `Comprehensive Protocol Update: ${taskDetails.title}`,
            type: "task_update",
            link: link
          }));
          await adminClient.from("notifications").insert(notifications);
        }
      }
    } catch (err) {
      console.warn("Failed to send full update notifications:", err);
    }
  })();

  return task;
}

export async function getTaskComments(taskId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("task_comments")
    .select("*, profiles(full_name, avatar_url)")
    .eq("task_id", taskId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return data;
}

export async function addTaskComment(taskId: string, content: string) {
  const supabase = await createClient();
  
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  const permissions = await getUserPermissions(userData.user.id);
  const resourceNames = [RESOURCES.WORKSPACE, "module_workspace", "workspace_tasks", "tasks", "workspace"];
  const hasWorkspaceAccess = permissions.some(p => 
    resourceNames.includes(p.resource) && (p.action === 'read' || p.action === 'update' || p.action === 'manage' || p.action === '*')
  ) || hasPermission(permissions, "*", "manage");

  const queryClient = hasWorkspaceAccess ? createAdminClient() : supabase;

  const { data: comment, error } = await queryClient
    .from("task_comments")
    .insert([{ task_id: taskId, content, profile_id: userData.user.id }])
    .select()
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!comment) throw new Error("Failed to add comment: Insufficient permissions or task not found.");

  // Background Notifications
  (async () => {
    try {
      const adminClient = createAdminClient();
      const { data: taskDetails } = await adminClient
        .from("tasks")
        .select("title, created_by, task_assignees(profiles(id, email))")
        .eq("id", taskId)
        .maybeSingle();
      
      if (taskDetails) {
        const stakeholderIds = new Set<string>();
        const stakeholderEmails = new Set<string>();

        // 1. Add Assignees
        taskDetails.task_assignees?.forEach((ta: any) => {
          if (ta.profiles?.id) stakeholderIds.add(ta.profiles.id);
          if (ta.profiles?.email) stakeholderEmails.add(ta.profiles.email);
        });

        // 2. Add Creator
        const { data: creatorProfile } = await adminClient.from("profiles").select("id, email").eq("id", taskDetails.created_by).single();
        if (creatorProfile?.id) stakeholderIds.add(creatorProfile.id);
        if (creatorProfile?.email) stakeholderEmails.add(creatorProfile.email);

        // 3. --- NEW: Parse Mentions ---
        // Regex to find @Mention or @Mention Name (non-greedy)
        const mentionMatches = content.match(/@\w+(?:\s\w+)?/g);
        if (mentionMatches) {
          const mentionedNames = mentionMatches.map(m => m.slice(1).trim());
          const { data: mentionedProfiles } = await adminClient
            .from("profiles")
            .select("id, email")
            .in("full_name", mentionedNames);
          
          mentionedProfiles?.forEach(p => {
            stakeholderIds.add(p.id);
            stakeholderEmails.add(p.email);
          });
        }

        // 4. Clean up: Don't notify the person who just commented
        stakeholderIds.delete(userData.user.id);
        if (userData.user.email) stakeholderEmails.delete(userData.user.email);

        // 5. Send Email Notifications
        for (const email of stakeholderEmails) {
          await sendTaskReplyNotification(email, taskDetails.title, content);
        }

        // 6. Send In-App Notifications
        if (stakeholderIds.size > 0) {
          const notificationInserts = Array.from(stakeholderIds).map(pid => ({
            task_id: taskId,
            profile_id: pid,
            message: `${userData.user.user_metadata?.full_name || 'Someone'} mentioned you in: ${taskDetails.title}`
          }));
          await adminClient.from("task_notifications").insert(notificationInserts);
        }
      }
    } catch (err) {
      console.warn("Failed to send comment notifications:", err);
    }
  })();

  return comment;
}

export async function uploadTaskAttachment(taskId: string, formData: FormData) {
  const file = formData.get("file") as File;
  if (!file) throw new Error("No file provided");

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  const fileExt = file.name.split('.').pop();
  const fileName = `${taskId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from("task_attachments")
    .upload(fileName, file);

  if (uploadError) {
    throw new Error(`Storage upload failed: ${uploadError.message}`);
  }

  // Save record
  const { data, error } = await supabase
    .from("task_attachments")
    .insert([{
      task_id: taskId,
      uploaded_by: userData.user.id,
      file_name: file.name,
      file_size: file.size,
      content_type: file.type,
      storage_path: fileName
    }])
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function getTaskAttachments(taskId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("task_attachments")
    .select("*, profiles(full_name)")
    .eq("task_id", taskId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return data;
}

export async function getWorkspace(workspaceId: string) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  const permissions = await getUserPermissions(userData.user.id);
  const canRead = hasPermission(permissions, RESOURCES.WORKSPACE, "read") || 
                  hasPermission(permissions, "*", "manage");

  const queryClient = canRead ? createAdminClient() : supabase;

  const { data, error } = await queryClient
    .from("workspaces")
    .select("*")
    .eq("id", workspaceId)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateWorkspace(workspaceId: string, data: { name: string; description?: string }) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  const { data: workspace, error } = await supabase
    .from("workspaces")
    .update(data)
    .eq("id", workspaceId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/workspace");
  revalidatePath(`/workspace/${workspaceId}`);
  return workspace;
}

export async function deleteWorkspace(workspaceId: string) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("workspaces")
    .delete()
    .eq("id", workspaceId);

  if (error) throw new Error(error.message);
  revalidatePath("/workspace");
}

export async function getProject(projectId: string) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  const permissions = await getUserPermissions(userData.user.id);
  const canRead = hasPermission(permissions, RESOURCES.WORKSPACE, "read") || 
                  hasPermission(permissions, "*", "manage");

  const queryClient = canRead ? createAdminClient() : supabase;

  const { data, error } = await queryClient
    .from("workspace_projects")
    .select("*")
    .eq("id", projectId)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateProject(projectId: string, data: { name: string; description?: string }) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  const { data: project, error } = await supabase
    .from("workspace_projects")
    .update(data)
    .eq("id", projectId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath(`/workspace/${project.workspace_id}`);
  revalidatePath(`/workspace/${project.workspace_id}/project/${projectId}`);
  return project;
}

export async function deleteProject(projectId: string) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  const project = await getProject(projectId);

  const { error } = await supabase
    .from("workspace_projects")
    .delete()
    .eq("id", projectId);

  if (error) throw new Error(error.message);
  revalidatePath(`/workspace/${project.workspace_id}`);
}

// --- MILESTONES ---

export async function getMilestones(projectId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workspace_milestones")
    .select("*")
    .eq("project_id", projectId)
    .order("due_date", { ascending: true });

  if (error) return []; // Table might not exist yet if user hasn't run SQL
  return data;
}

export async function createMilestone(projectId: string, data: { name: string; due_date?: string }) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  const { data: milestone, error } = await supabase
    .from("workspace_milestones")
    .insert([{ ...data, project_id: projectId, created_by: userData.user.id }])
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath(`/workspace`);
  return milestone;
}

export async function updateMilestoneStatus(milestoneId: string, status: string) {
  const supabase = await createClient();
  const { data: milestone, error } = await supabase
    .from("workspace_milestones")
    .update({ status })
    .eq("id", milestoneId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath(`/workspace`);
  return milestone;
}

// --- CHECKLISTS ---

export async function getChecklists(taskId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("task_checklists")
    .select("*")
    .eq("task_id", taskId)
    .order("position", { ascending: true });

  if (error) return [];
  return data;
}

export async function addChecklistItem(taskId: string, content: string) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  const { data: item, error } = await supabase
    .from("task_checklists")
    .insert([{ task_id: taskId, content, created_by: userData.user.id }])
    .select()
    .single();

  if (error) throw new Error(error.message);
  return item;
}

export async function toggleChecklistItem(checklistId: string, is_completed: boolean) {
  const supabase = await createClient();
  const { data: item, error } = await supabase
    .from("task_checklists")
    .update({ is_completed })
    .eq("id", checklistId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return item;
}

export async function removeChecklistItem(checklistId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("task_checklists")
    .delete()
    .eq("id", checklistId);

  if (error) throw new Error(error.message);
}

// --- USER SCOPE ---

export async function getMyTasks() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  // We need to fetch tasks where the current user is an assignee
  // Wait, task_assignees holds the mapping. We can inner join.
  const { data, error } = await supabase
    .from("tasks")
    .select("*, task_assignees!inner(profile_id), workspace_projects(name, workspace_id)")
    .eq("task_assignees.profile_id", userData.user.id)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

export async function getAllTasks() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  const { data: isAdmin } = await supabase.rpc("is_admin_safe_v2", { p_profile_id: userData.user.id });

  let query = supabase
    .from("tasks")
    .select("*, workspace_projects(name, workspace_id, workspace:workspaces(name)), task_assignees(profile_id, profiles(full_name, email))")
    .order("created_at", { ascending: false });

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}

export async function getWorkloadData() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  // Fetch all profiles
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, email");

  // Fetch all active tasks (not complete)
  const { data: tasks } = await supabase
    .from("tasks")
    .select("*, task_assignees(profile_id)")
    .neq("status", "COMPLETE");

  // Fetch all active tickets (not closed/resolved)
  const { data: tickets } = await supabase
    .from("tickets")
    .select("id, subject, status, priority, assigned_to")
    .not("status", "in", "('Resolved', 'Closed')");

  if (!profiles) return [];

  // Map data to profiles
  const workload = profiles.map(profile => {
    const userTasks = tasks?.filter(t => t.task_assignees?.some((ta: any) => ta.profile_id === profile.id)) || [];
    const userTickets = tickets?.filter(t => t.assigned_to === profile.id) || [];

    return {
      ...profile,
      tasks: userTasks,
      tickets: userTickets,
      taskCount: userTasks.length,
      ticketCount: userTickets.length,
      totalLoad: userTasks.length + userTickets.length
    };
  });

  return workload.sort((a, b) => b.totalLoad - a.totalLoad);
}

export async function getUnreadTaskNotifications() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [];

  const { data, error } = await supabase
    .from("task_notifications")
    .select("*, tasks(title, project_id, workspace_projects(workspace_id))")
    .eq("profile_id", userData.user.id)
    .eq("is_read", false)
    .order("created_at", { ascending: false });

  if (error) return [];
  return data;
}

export async function markTaskNotificationsRead(taskId: string) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return;

  await supabase
    .from("task_notifications")
    .update({ is_read: true })
    .eq("task_id", taskId)
    .eq("profile_id", userData.user.id);
}
export async function updateTaskAssignees(taskId: string, assignees: string[]) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  // Check permissions to determine if we should use admin client
  const permissions = await getUserPermissions(userData.user.id);
  const resourceNames = [RESOURCES.WORKSPACE, "module_workspace", "workspace_tasks", "tasks", "workspace"];
  const canUpdate = permissions.some(p => 
    resourceNames.includes(p.resource) && (p.action === 'update' || p.action === 'manage' || p.action === '*')
  ) || hasPermission(permissions, "*", "manage");

  const queryClient = canUpdate ? createAdminClient() : supabase;

  // Get current assignees for delta notification
  const { data: oldAssignees } = await queryClient
    .from("task_assignees")
    .select("profile_id")
    .eq("task_id", taskId);

  const oldSet = new Set(oldAssignees?.map(a => a.profile_id) || []);
  const newSet = new Set(assignees);

  // Profiles to notify of NEW assignment
  const newlyAssigned = assignees.filter(id => !oldSet.has(id));

  // Sync database
  const { error: deleteError } = await queryClient.from("task_assignees").delete().eq("task_id", taskId);
  if (deleteError) throw new Error("Failed to clear old assignees: " + deleteError.message);

  if (assignees.length > 0) {
    const assigneeInserts = assignees.map((profile_id: string) => ({
      task_id: taskId,
      profile_id
    }));
    const { error: insertError } = await queryClient.from("task_assignees").insert(assigneeInserts);
    if (insertError) throw new Error("Failed to add new assignees: " + insertError.message);

    // Auto-enroll new assignees as workspace members
    try {
      const adminClient = createAdminClient();
      const { data: taskData } = await adminClient
        .from("tasks")
        .select("project_id, workspace_projects(workspace_id)")
        .eq("id", taskId)
        .single();
      
      const wsId = (taskData as any)?.workspace_projects?.workspace_id;
      if (wsId) {
        const memberInserts = assignees.map((profile_id: string) => ({
          workspace_id: wsId,
          profile_id,
          role: 'member'
        }));
        await adminClient.from("workspace_members").upsert(memberInserts, { onConflict: 'workspace_id,profile_id', ignoreDuplicates: true });
      }
    } catch (err) {
      console.warn("Failed to auto-enroll assignees as workspace members:", err);
    }
  }

  // Log activity
  await queryClient.from("task_activity_logs").insert([{
    task_id: taskId,
    action_type: 'assignees_updated',
    created_by: userData.user.id,
    metadata: { count: assignees.length }
  }]);

  // Background Notifications
  (async () => {
    try {
      const { data: taskDetails } = await supabase
        .from("tasks")
        .select("title, created_by")
        .eq("id", taskId)
        .single();
      
      if (taskDetails) {
        if (newlyAssigned.length > 0) {
          const { data: profiles } = await supabase.from("profiles").select("id, email").in("id", newlyAssigned);
          
          if (profiles) {
            for (const p of profiles) {
              if (p.email) await sendTaskAssignmentNotification(p.email, taskDetails.title);
              
              await supabase.from("ticket_notifications").insert([{
                task_id: taskId,
                user_id: p.id,
                message: `You have been assigned to: ${taskDetails.title}`
              }]);
            }
          }
        }
      }
    } catch (err) {
      console.warn("Failed to send assignment update notifications:", err);
    }
  })();

  revalidatePath("/workspace");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function atomicUpdateTask(taskId: string, updates: any, assignees?: string[]) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData || !userData.user) throw new Error("Unauthorized");

  const permissions = await getUserPermissions(userData.user.id);
  const resourceNames = [RESOURCES.WORKSPACE, "module_workspace", "workspace_tasks", "tasks", "workspace"];
  const canUpdate = permissions.some(p => 
    resourceNames.includes(p.resource) && (p.action === 'update' || p.action === 'manage' || p.action === '*')
  ) || hasPermission(permissions, "*", "manage");

  const queryClient = canUpdate ? createAdminClient() : supabase;

  // 1. Update Core Fields
  if (Object.keys(updates).length > 0) {
    const { error } = await queryClient.from("tasks").update(updates).eq("id", taskId);
    if (error) throw new Error("Field Update Failed: " + error.message);
  }

  // 2. Update Assignees if provided
  if (assignees) {
    await queryClient.from("task_assignees").delete().eq("task_id", taskId);
    if (assignees.length > 0) {
      const inserts = assignees.map(id => ({ task_id: taskId, profile_id: id }));
      await queryClient.from("task_assignees").insert(inserts);
    }
  }

  revalidatePath("/workspace");
  revalidatePath("/dashboard");
  return { success: true };
}
export async function getTeams() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("teams").select("*").order("name");
  if (error) throw new Error(error.message);
  return data;
}

export async function getTeamMembers(teamId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("team_members")
    .select("profile_id")
    .eq("team_id", teamId);
  if (error) throw new Error(error.message);
  return data.map(m => m.profile_id);
}
