-- Script para asignar TODOS los permisos al rol Super Admin

-- Primero, eliminar permisos existentes del Super Admin para evitar duplicados
DELETE FROM role_permissions 
WHERE "roleId" = (SELECT id FROM roles WHERE name = 'Super Admin');

-- Insertar TODOS los permisos disponibles para el rol Super Admin
INSERT INTO role_permissions ("roleId", "permissionId")
SELECT 
  (SELECT id FROM roles WHERE name = 'Super Admin'),
  p.id
FROM permissions p
WHERE NOT EXISTS (
  SELECT 1 FROM role_permissions rp 
  WHERE rp."roleId" = (SELECT id FROM roles WHERE name = 'Super Admin')
  AND rp."permissionId" = p.id
);

-- Verificar resultado
SELECT 
  'Total permisos en sistema:' as info,
  COUNT(*) as cantidad
FROM permissions
UNION ALL
SELECT 
  'Permisos asignados a Super Admin:' as info,
  COUNT(*) as cantidad
FROM role_permissions rp
JOIN roles r ON r.id = rp."roleId"
WHERE r.name = 'Super Admin';
