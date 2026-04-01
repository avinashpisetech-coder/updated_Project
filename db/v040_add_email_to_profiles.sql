-- v040_add_email_to_profiles.sql
-- Adds missing email column to profiles table and backfills from auth.users.
-- Run after v039_fix_assignable_profiles_status_and_dropdown.sql.

-- 1. Add the email column to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS email text;

-- 2. Backfill existing emails from auth.users
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL;

-- 3. Create an index for faster lookups (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- 4. In Phase 2/3, we might want to ensure email is unique and NOT NULL
-- ALTER TABLE public.profiles ALTER COLUMN email SET NOT NULL;
