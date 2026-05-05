-- v220_workspace_performance_tuning.sql
-- Description: Add missing indexes to core workspace tables to eliminate sequential scans and boost performance.

BEGIN;

-- 1. Tasks Table Optimization
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON public.tasks (project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at_desc ON public.tasks (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks (status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON public.tasks (priority);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON public.tasks (created_by);

-- 2. Task Assignees Optimization
CREATE INDEX IF NOT EXISTS idx_task_assignees_task_id ON public.task_assignees (task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignees_profile_id ON public.task_assignees (profile_id);

-- 3. Workspace Projects & Members Optimization
CREATE INDEX IF NOT EXISTS idx_workspace_projects_workspace_id ON public.workspace_projects (workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id ON public.workspace_members (workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_profile_id ON public.workspace_members (profile_id);

-- 4. Activity Logs (Crucial for performance)
CREATE INDEX IF NOT EXISTS idx_task_activity_logs_task_id ON public.task_activity_logs (task_id);
CREATE INDEX IF NOT EXISTS idx_task_activity_logs_created_at ON public.task_activity_logs (created_at DESC);

-- 5. Notifications (Faster bell response)
CREATE INDEX IF NOT EXISTS idx_task_notifications_profile_unread ON public.task_notifications (profile_id) WHERE is_read = false;

COMMIT;
