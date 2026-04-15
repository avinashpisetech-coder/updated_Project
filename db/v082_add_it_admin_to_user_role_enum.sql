-- v082_add_it_admin_to_user_role_enum.sql
-- Description: Add 'it_admin' to user_role enum to support granular IT Asset Management permissions.

ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'it_admin';
