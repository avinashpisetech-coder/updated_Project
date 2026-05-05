-- v027_auto_permissions_and_access_seed.sql
-- Auto-generate role permissions for new modules/ERP transactions
-- and auto-seed profile_module_access rows for new modules/profiles.
--
-- This makes access-control future-safe:
-- 1) new modules => permissions auto-created + access matrix rows auto-seeded
-- 2) new ERP modules/sub-modules => permissions auto-created
-- 3) new profiles => access matrix rows auto-seeded for existing modules

-- Helper: stable slug normalizer for permission/resource keys
CREATE OR REPLACE FUNCTION public.norm_slug(raw text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT regexp_replace(lower(coalesce(raw, '')), '[^a-z0-9]+', '_', 'g');
$$;

-- Upsert the standard CRUD permissions for a resource key
CREATE OR REPLACE FUNCTION public.ensure_crud_permissions(resource_key text, resource_label text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  key text := public.norm_slug(resource_key);
  label text := coalesce(resource_label, 'resource');
BEGIN
  INSERT INTO public.permissions (name, description, resource, action)
  VALUES
    ('create_' || key, 'Create records for ' || label, key, 'create'),
    ('view_'   || key, 'View records for ' || label, key, 'read'),
    ('update_' || key, 'Update records for ' || label, key, 'update'),
    ('delete_' || key, 'Delete records for ' || label, key, 'delete')
  ON CONFLICT (name) DO NOTHING;
END;
$$;

-- Seed module-access rows for all profiles for a module (default all false)
CREATE OR REPLACE FUNCTION public.seed_profile_access_for_module(module_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profile_module_access (
    profile_id,
    module_id,
    can_view,
    can_create,
    can_update,
    can_delete,
    access_scope
  )
  SELECT
    p.id,
    module_uuid,
    false,
    false,
    false,
    false,
    'self'
  FROM public.profiles p
  ON CONFLICT (profile_id, module_id) DO NOTHING;
END;
$$;

-- Seed module-access rows for one profile for all modules (default all false)
CREATE OR REPLACE FUNCTION public.seed_module_access_for_profile(profile_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profile_module_access (
    profile_id,
    module_id,
    can_view,
    can_create,
    can_update,
    can_delete,
    access_scope
  )
  SELECT
    profile_uuid,
    m.id,
    false,
    false,
    false,
    false,
    'self'
  FROM public.modules m
  ON CONFLICT (profile_id, module_id) DO NOTHING;
END;
$$;

-- Trigger: new core module => CRUD permissions + access seed rows
CREATE OR REPLACE FUNCTION public.trg_modules_after_insert_auto_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.ensure_crud_permissions('module_' || NEW.slug, NEW.name || ' module');
  PERFORM public.seed_profile_access_for_module(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_modules_after_insert_auto_access ON public.modules;
CREATE TRIGGER trg_modules_after_insert_auto_access
AFTER INSERT ON public.modules
FOR EACH ROW
EXECUTE FUNCTION public.trg_modules_after_insert_auto_access();

-- Trigger: new ERP module => CRUD permissions
CREATE OR REPLACE FUNCTION public.trg_erp_modules_after_insert_permissions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.ensure_crud_permissions('erp_module_' || public.norm_slug(NEW.name), NEW.name || ' ERP module');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_erp_modules_after_insert_permissions ON public.erp_modules;
CREATE TRIGGER trg_erp_modules_after_insert_permissions
AFTER INSERT ON public.erp_modules
FOR EACH ROW
EXECUTE FUNCTION public.trg_erp_modules_after_insert_permissions();

-- Trigger: new ERP transaction/sub-module => CRUD permissions
CREATE OR REPLACE FUNCTION public.trg_erp_sub_modules_after_insert_permissions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  parent_name text;
BEGIN
  SELECT name INTO parent_name FROM public.erp_modules WHERE id = NEW.erp_module_id;
  PERFORM public.ensure_crud_permissions(
    'erp_txn_' || public.norm_slug(parent_name) || '_' || public.norm_slug(NEW.name),
    coalesce(parent_name, 'ERP') || ' - ' || NEW.name || ' transaction'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_erp_sub_modules_after_insert_permissions ON public.erp_sub_modules;
CREATE TRIGGER trg_erp_sub_modules_after_insert_permissions
AFTER INSERT ON public.erp_sub_modules
FOR EACH ROW
EXECUTE FUNCTION public.trg_erp_sub_modules_after_insert_permissions();

-- Trigger: new profile => module access rows for all current modules
CREATE OR REPLACE FUNCTION public.trg_profiles_after_insert_seed_module_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.seed_module_access_for_profile(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_after_insert_seed_module_access ON public.profiles;
CREATE TRIGGER trg_profiles_after_insert_seed_module_access
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.trg_profiles_after_insert_seed_module_access();

-- Backfill existing modules => permissions + access rows
DO $$
DECLARE
  m record;
  em record;
  esm record;
  p record;
BEGIN
  FOR m IN SELECT id, name, slug FROM public.modules LOOP
    PERFORM public.ensure_crud_permissions('module_' || m.slug, m.name || ' module');
    PERFORM public.seed_profile_access_for_module(m.id);
  END LOOP;

  FOR em IN SELECT id, name FROM public.erp_modules LOOP
    PERFORM public.ensure_crud_permissions('erp_module_' || public.norm_slug(em.name), em.name || ' ERP module');
  END LOOP;

  FOR esm IN
    SELECT esubm.name AS sub_name, erm.name AS module_name
    FROM public.erp_sub_modules esubm
    JOIN public.erp_modules erm ON erm.id = esubm.erp_module_id
  LOOP
    PERFORM public.ensure_crud_permissions(
      'erp_txn_' || public.norm_slug(esm.module_name) || '_' || public.norm_slug(esm.sub_name),
      esm.module_name || ' - ' || esm.sub_name || ' transaction'
    );
  END LOOP;

  FOR p IN SELECT id FROM public.profiles LOOP
    PERFORM public.seed_module_access_for_profile(p.id);
  END LOOP;
END $$;

GRANT EXECUTE ON FUNCTION public.norm_slug(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_crud_permissions(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.seed_profile_access_for_module(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.seed_module_access_for_profile(uuid) TO authenticated;
