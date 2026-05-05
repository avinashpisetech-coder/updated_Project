-- v201_backfill_workspace_members.sql
-- Description: One-time backfill to add all existing task assignees as workspace members.
-- This fixes the gap where users were assigned to tasks but never added to workspace_members,
-- causing them to not see workspaces in the "All Workspaces" view.

-- Backfill: For every task assignee, ensure they have a workspace_members entry
INSERT INTO workspace_members (workspace_id, profile_id, role)
SELECT DISTINCT wp.workspace_id, ta.profile_id, 'member'::workspace_role
FROM task_assignees ta
JOIN tasks t ON t.id = ta.task_id
JOIN workspace_projects wp ON wp.id = t.project_id
WHERE NOT EXISTS (
  SELECT 1 FROM workspace_members wm
  WHERE wm.workspace_id = wp.workspace_id
    AND wm.profile_id = ta.profile_id
);
