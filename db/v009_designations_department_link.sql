-- v009_designations_department_link.sql
-- Add department_id to designations table to establish a filtering relationship

ALTER TABLE public.designations
ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id) ON DELETE CASCADE;

-- Default all existing designations to a single department if needed or leave them null
-- Since we do not know the exact mapping, leaving them NULL is safer.
-- If they are NULL, they might need to be assigned manually via the UI.
