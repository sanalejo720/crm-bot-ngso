-- Activar usuario admin@crm.com
UPDATE users 
SET status = 'active' 
WHERE email = 'admin@crm.com';

-- Verificar el cambio
SELECT id, "fullName", email, status, "roleId" 
FROM users 
WHERE email = 'admin@crm.com';
