-- Script SQL para crear permisos del módulo de Backups
-- NGS&O CRM Gestión - Sistema de Backups IT
-- Ejecutar en PostgreSQL

-- 1. Crear permisos para el módulo de Backups
INSERT INTO permissions (description, module, action, "createdAt")
VALUES 
  ('Crear backups del sistema', 'backups', 'create', NOW()),
  ('Listar y ver backups', 'backups', 'read', NOW()),
  ('Descargar backups cifrados', 'backups', 'download', NOW()),
  ('Eliminar backups', 'backups', 'delete', NOW())
ON CONFLICT (module, action) DO NOTHING;

-- 2. Obtener el ID del rol Super Admin
DO $$
DECLARE
  super_admin_role_id UUID;
  backup_create_permission_id UUID;
  backup_read_permission_id UUID;
  backup_download_permission_id UUID;
  backup_delete_permission_id UUID;
BEGIN
  -- Obtener el ID del rol Super Admin
  SELECT id INTO super_admin_role_id FROM roles WHERE name = 'Super Admin';
  
  -- Obtener los IDs de los permisos de backups
  SELECT id INTO backup_create_permission_id FROM permissions WHERE module = 'backups' AND action = 'create';
  SELECT id INTO backup_read_permission_id FROM permissions WHERE module = 'backups' AND action = 'read';
  SELECT id INTO backup_download_permission_id FROM permissions WHERE module = 'backups' AND action = 'download';
  SELECT id INTO backup_delete_permission_id FROM permissions WHERE module = 'backups' AND action = 'delete';
  
  -- Asignar todos los permisos de backups al rol Super Admin
  INSERT INTO role_permissions ("roleId", "permissionId")
  VALUES 
    (super_admin_role_id, backup_create_permission_id),
    (super_admin_role_id, backup_read_permission_id),
    (super_admin_role_id, backup_download_permission_id),
    (super_admin_role_id, backup_delete_permission_id)
  ON CONFLICT DO NOTHING;
  
  RAISE NOTICE 'Permisos de Backups asignados exitosamente al rol Super Admin';
END $$;

-- 3. Verificar que los permisos se crearon correctamente
SELECT 
  p.module || ':' || p.action as permission,
  p.description,
  p.module,
  p.action
FROM permissions p
WHERE p.module = 'backups'
ORDER BY p.action;

-- 4. Verificar que los permisos están asignados al Super Admin
SELECT 
  r.name as role_name,
  p.module || ':' || p.action as permission_name,
  p.description
FROM roles r
INNER JOIN role_permissions rp ON rp."roleId" = r.id
INNER JOIN permissions p ON p.id = rp."permissionId"
WHERE r.name = 'Super Admin' AND p.module = 'backups'
ORDER BY p.action;
