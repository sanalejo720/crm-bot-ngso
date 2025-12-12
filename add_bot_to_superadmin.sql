-- Add bot permissions to Super Admin role
INSERT INTO role_permissions ("roleId", "permissionId")
SELECT r.id, p.id 
FROM roles r, permissions p
WHERE r.name = 'Super Admin' 
  AND p.module = 'bot'
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp2 
    WHERE rp2."roleId" = r.id AND rp2."permissionId" = p.id
  );

-- Verify permissions were added
SELECT r.name as role, p.module, p.action 
FROM roles r 
JOIN role_permissions rp ON r.id = rp."roleId" 
JOIN permissions p ON rp."permissionId" = p.id 
WHERE r.name = 'Super Admin' AND p.module = 'bot'
ORDER BY p.action;
