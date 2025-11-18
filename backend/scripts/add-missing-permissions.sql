-- Agregar permisos faltantes
INSERT INTO permissions (id, module, action, description, "createdAt") VALUES
(gen_random_uuid(), 'chats', 'create', 'Crear chats', NOW()),
(gen_random_uuid(), 'messages', 'create', 'Crear mensajes', NOW())
ON CONFLICT DO NOTHING;

-- Asignar todos los permisos a Super Admin
INSERT INTO role_permissions ("roleId", "permissionId")
SELECT 
    (SELECT id FROM roles WHERE name = 'Super Admin'),
    id
FROM permissions
WHERE (module = 'chats' AND action = 'create')
   OR (module = 'messages' AND action = 'create')
ON CONFLICT DO NOTHING;
