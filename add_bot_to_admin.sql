-- Asignar permisos bot al rol Administrador
INSERT INTO role_permissions ("roleId", "permissionId")
SELECT 
    r.id,
    p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Administrador' 
  AND p.module = 'bot'
ON CONFLICT DO NOTHING;

-- Verificar asignación
SELECT r.name as role, p.module, p.action 
FROM roles r 
JOIN role_permissions rp ON r.id = rp."roleId" 
JOIN permissions p ON rp."permissionId" = p.id 
WHERE r.name = 'Administrador' AND p.module = 'bot'
ORDER BY p.action;
