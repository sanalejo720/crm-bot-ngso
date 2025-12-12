-- Verificar permisos de evidences para Super Admin
SELECT 
  r.name as role_name,
  p.module,
  p.action,
  p.description
FROM role_permissions rp
JOIN permissions p ON p.id = rp."permissionId"
JOIN roles r ON r.id = rp."roleId"
WHERE r.name = 'Super Admin' 
  AND p.module = 'evidences'
ORDER BY p.module, p.action;
