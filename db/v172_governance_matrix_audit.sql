/**
 * v172_governance_matrix_audit.sql
 * VERIFIES: Whether 'Security Access' (Security & IAM) is correctly linked to your current user identity.
 * Run this AFTER running v171.
 */

SELECT 
    p.full_name AS user_identity,
    r.name AS matrix_role,
    perm.resource AS protocol,
    perm.action AS capability
FROM public.profiles p
JOIN public.user_roles ur ON p.id = ur.user_id
JOIN public.roles r ON ur.role_id = r.id
JOIN public.role_permissions rp ON r.id = rp.role_id
JOIN public.permissions perm ON rp.permission_id = perm.id
WHERE (p.full_name ILIKE '%Avinash%' OR r.name ILIKE '%Admin%')
  AND perm.resource = 'module_access_control';
