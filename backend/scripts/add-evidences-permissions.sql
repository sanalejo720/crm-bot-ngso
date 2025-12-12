-- Agregar permiso de evidencias para Supervisores y Super Admin
-- Ejecutar después de crear la tabla evidences

-- 1. Crear permisos de evidencias
INSERT INTO permissions (id, name, description, module, action, resource, "createdAt", "updatedAt")
VALUES 
  (gen_random_uuid(), 'evidences:read', 'Ver evidencias de pago', 'evidences', 'read', 'evidences', NOW(), NOW()),
  (gen_random_uuid(), 'evidences:download', 'Descargar PDFs de evidencias', 'evidences', 'download', 'evidences', NOW(), NOW())
ON CONFLICT (module, action, resource) DO NOTHING;

-- 2. Asignar permisos a rol Supervisor
INSERT INTO role_permissions ("roleId", "permissionId")
SELECT 
  r.id,
  p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Supervisor'
  AND p.module = 'evidences'
ON CONFLICT DO NOTHING;

-- 3. Asignar permisos a rol Super Admin
INSERT INTO role_permissions ("roleId", "permissionId")
SELECT 
  r.id,
  p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Super Admin'
  AND p.module = 'evidences'
ON CONFLICT DO NOTHING;

SELECT 
  'Permisos de evidencias creados y asignados correctamente' as resultado;
