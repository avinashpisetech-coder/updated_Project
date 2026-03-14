-- v003_seed_modules.sql
-- Seed the three default modules: Help Desk, ERP, General.
-- Run after v001_initial_schema.sql. Safe to run multiple times.

INSERT INTO modules (name, slug, icon, color, assignment_mode, is_active)
SELECT 'Help Desk', 'help-desk', 'headphones', '#2563eb', 'self_pick', true
WHERE NOT EXISTS (SELECT 1 FROM modules WHERE slug = 'help-desk');

INSERT INTO modules (name, slug, icon, color, assignment_mode, is_active)
SELECT 'ERP', 'erp', 'database', '#059669', 'self_pick', true
WHERE NOT EXISTS (SELECT 1 FROM modules WHERE slug = 'erp');

INSERT INTO modules (name, slug, icon, color, assignment_mode, is_active)
SELECT 'General', 'general', 'inbox', '#6b7280', 'admin_only', true
WHERE NOT EXISTS (SELECT 1 FROM modules WHERE slug = 'general');
