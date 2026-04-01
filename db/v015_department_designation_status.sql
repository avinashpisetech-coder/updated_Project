-- Add active/inactive status to departments and designations
ALTER TABLE public.departments
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'Active';

ALTER TABLE public.designations
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'Active';
