INSERT INTO role_permissions ("roleId", "permissionId")
SELECT r.id, p.id 
FROM roles r, permissions p 
WHERE r.name = 'Agente' 
  AND p.module = 'chats' 
  AND p.action = 'update'
ON CONFLICT DO NOTHING;

SELECT 'Permiso chats:update agregado al rol Agente' as resultado;
