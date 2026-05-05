-- v214_advanced_workspace_features.sql
-- Database enhancements for Resolution Protocol and Ticket Escalation

-- Add resolution_note to tasks
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS resolution_note text;

-- Add escalated_from_ticket_id to workspace_projects for traceability
ALTER TABLE public.workspace_projects
ADD COLUMN IF NOT EXISTS escalated_from_ticket_id uuid REFERENCES public.tickets(id) ON DELETE SET NULL;

-- Index for performance in Workload view
CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON public.tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_task_assignees_profile_id ON public.task_assignees(profile_id);

-- Update activity logs action types if needed (informational only)
-- 'task_resolved' will be used for completion with notes
