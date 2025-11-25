-- Agregar permisos para bot
INSERT INTO permissions (id, module, action, description, "createdAt") VALUES
(gen_random_uuid(), 'bot', 'create', 'Iniciar bot', NOW()),
(gen_random_uuid(), 'bot', 'read', 'Ver bots', NOW()),
(gen_random_uuid(), 'bot', 'update', 'Actualizar bot', NOW())
ON CONFLICT DO NOTHING;

-- Asignar a Super Admin
INSERT INTO role_permissions ("roleId", "permissionId")
SELECT 
    (SELECT id FROM roles WHERE name = 'Super Admin'),
    id
FROM permissions
WHERE module = 'bot'
ON CONFLICT DO NOTHING;
