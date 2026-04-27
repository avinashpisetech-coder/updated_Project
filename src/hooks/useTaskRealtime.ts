"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function useTaskRealtime(taskId: string) {
  const [comments, setComments] = useState<any[]>([]);
  const [taskStatus, setTaskStatus] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    // Initial fetch
    const fetchInitialData = async () => {
      const { data: initialComments, error } = await supabase
        .from("task_comments")
        .select("*, profiles(full_name, avatar_url)")
        .eq("task_id", taskId)
        .order("created_at", { ascending: true });
      
      if (error) console.error("Error fetching comments:", error);
      if (initialComments) setComments(initialComments);

      const { data: taskData } = await supabase
        .from("tasks")
        .select("status")
        .eq("id", taskId)
        .single();
      
      if (taskData) setTaskStatus(taskData.status);
    };

    fetchInitialData();

    // Subscribe to realtime updates
    const channel = supabase.channel(`task_${taskId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'task_comments', filter: `task_id=eq.${taskId}` },
        async (payload) => {
          // Fetch the full profile details for the new comment
          const { data: newComment } = await supabase
            .from("task_comments")
            .select("*, profiles(full_name, avatar_url)")
            .eq("id", payload.new.id)
            .single();
          
          if (newComment) {
            setComments((prev) => {
              if (prev.find(c => c.id === newComment.id)) return prev;
              return [...prev, newComment];
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tasks', filter: `id=eq.${taskId}` },
        (payload) => {
          setTaskStatus(payload.new.status);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [taskId, supabase]);

  return { comments, setComments, taskStatus };
}
