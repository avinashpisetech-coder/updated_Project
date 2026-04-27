-- v199: Add Workspace resource permissions
-- Safe insert using WHERE NOT EXISTS (no unique constraint required)

INSERT INTO permissions (name, description, resource, action)
SELECT name, description, resource, action
FROM (VALUES
  ('workspace.read',   'View workspace, projects, and tasks',    'workspace', 'read'),
  ('workspace.create', 'Create workspaces, projects, and tasks', 'workspace', 'create'),
  ('workspace.update', 'Edit workspaces, projects, and tasks',   'workspace', 'update'),
  ('workspace.delete', 'Delete workspaces, projects, and tasks', 'workspace', 'delete')
) AS new_perms(name, description, resource, action)
WHERE NOT EXISTS (
  SELECT 1 FROM permissions p
  WHERE p.resource = new_perms.resource
    AND p.action   = new_perms.action
);

-- Grant workspace read + create to all existing non-guest roles
-- Uses WHERE NOT EXISTS to skip already-assigned pairs safely
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE p.resource = 'workspace'
  AND p.action IN ('read', 'create')
  AND r.name NOT ILIKE '%guest%'
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id      = r.id
      AND rp.permission_id = p.id
  );
