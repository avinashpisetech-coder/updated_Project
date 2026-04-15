-- v136_b_add_procurement_role.sql
-- Description: Add 'procurement_admin' to user_role enum to support the new AssetGuard governance model.

ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'procurement_admin';
