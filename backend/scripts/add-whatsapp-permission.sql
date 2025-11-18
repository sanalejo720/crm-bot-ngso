-- Agregar permiso whatsapp:update
INSERT INTO permissions (id, module, action, description, "createdAt") 
VALUES (gen_random_uuid(), 'whatsapp', 'update', 'Actualizar configuración WhatsApp', NOW()) 
ON CONFLICT DO NOTHING;

-- Asignarlo a Super Admin
INSERT INTO role_permissions ("roleId", "permissionId") 
SELECT 
    (SELECT id FROM roles WHERE name = 'Super Admin'), 
    id 
FROM permissions 
WHERE module = 'whatsapp' AND action = 'update' 
ON CONFLICT DO NOTHING;
