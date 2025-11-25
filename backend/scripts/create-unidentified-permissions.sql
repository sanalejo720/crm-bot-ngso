-- Permisos para Módulo de Clientes No Identificados
DO $$
DECLARE
    super_admin_role_id UUID;
    perm_create_id UUID;
    perm_read_id UUID;
BEGIN
    SELECT id INTO super_admin_role_id FROM roles WHERE name = 'Super Admin';
    
    INSERT INTO permissions (id, name, description, resource, action, "createdAt", "updatedAt")
    VALUES 
        (gen_random_uuid(), 'unidentified_clients:create', 'Crear clientes no identificados', 'unidentified_clients', 'create', NOW(), NOW()),
        (gen_random_uuid(), 'unidentified_clients:read', 'Ver clientes no identificados', 'unidentified_clients', 'read', NOW(), NOW()),
        (gen_random_uuid(), 'unidentified_clients:update', 'Actualizar clientes no identificados', 'unidentified_clients', 'update', NOW(), NOW()),
        (gen_random_uuid(), 'unidentified_clients:delete', 'Eliminar clientes no identificados', 'unidentified_clients', 'delete', NOW(), NOW())
    ON CONFLICT (name) DO NOTHING;

    SELECT id INTO perm_create_id FROM permissions WHERE name = 'unidentified_clients:create';
    SELECT id INTO perm_read_id FROM permissions WHERE name = 'unidentified_clients:read';
    
    INSERT INTO role_permissions ("roleId", "permissionId")
    SELECT super_admin_role_id, id FROM permissions WHERE resource = 'unidentified_clients'
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Permisos creados exitosamente';
END $$;
