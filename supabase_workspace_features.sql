-- 1. Create Milestones Table
CREATE TABLE IF NOT EXISTS public.workspace_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.workspace_projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED')),
    due_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by UUID REFERENCES auth.users(id)
);

-- 2. Add columns to tasks table
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS milestone_id UUID REFERENCES public.workspace_milestones(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS parent_task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE;

-- 3. Create Task Checklists Table
CREATE TABLE IF NOT EXISTS public.task_checklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by UUID REFERENCES auth.users(id)
);

-- RLS Policies
ALTER TABLE public.workspace_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_checklists ENABLE ROW LEVEL SECURITY;

-- Note: RLS policies should be added here depending on existing policies for tasks and projects.
-- Assuming an authenticated user can read/write if they have access.
CREATE POLICY "Enable read access for authenticated users" ON public.workspace_milestones FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable write access for authenticated users" ON public.workspace_milestones FOR ALL TO authenticated USING (true);

CREATE POLICY "Enable read access for authenticated users" ON public.task_checklists FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable write access for authenticated users" ON public.task_checklists FOR ALL TO authenticated USING (true);
