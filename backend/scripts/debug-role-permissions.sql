-- Ver estructura completa de role_permissions
\d role_permissions

-- Contar total de registros
SELECT COUNT(*) as total_role_permissions FROM role_permissions;

-- Ver todos los role_permissions existentes
SELECT 
  r.name as role_name,
  COUNT(*) as permisos_count
FROM role_permissions rp
JOIN roles r ON r.id = rp."roleId"
GROUP BY r.name
ORDER BY r.name;
