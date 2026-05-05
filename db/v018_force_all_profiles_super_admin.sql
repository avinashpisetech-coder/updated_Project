-- Force all profiles to be super_admin at database level
-- 1) Convert existing rows
UPDATE public.profiles
SET role = 'super_admin'::user_role,
    updated_at = now()
WHERE role IS DISTINCT FROM 'super_admin'::user_role;

-- 2) Set default for future inserts
ALTER TABLE public.profiles
  ALTER COLUMN role SET DEFAULT 'super_admin'::user_role;

-- 3) Enforce on every insert/update regardless of source
CREATE OR REPLACE FUNCTION public.force_super_admin_role()
RETURNS trigger AS $$
BEGIN
  NEW.role := 'super_admin'::user_role;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_force_super_admin_role ON public.profiles;
CREATE TRIGGER trg_force_super_admin_role
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.force_super_admin_role();
