-- Reset passwords para usuarios de prueba
-- Password: password123 (hash bcrypt con 10 rounds)

UPDATE users 
SET password = '$2b$10$IQ/XlMFHCpJn6TLG52nm7euahUB6Y9NTiMKisI58sZZQ4YJI51kU6'
WHERE email = 'admin@crm.com';

UPDATE users 
SET password = '$2b$10$IQ/XlMFHCpJn6TLG52nm7euahUB6Y9NTiMKisI58sZZQ4YJI51kU6'
WHERE email = 'juan@crm.com';

UPDATE users 
SET password = '$2b$10$IQ/XlMFHCpJn6TLG52nm7euahUB6Y9NTiMKisI58sZZQ4YJI51kU6'
WHERE email LIKE '%@crm.com';

-- Verificar
SELECT email, 'password reseteado a: password123' as status FROM users WHERE email LIKE '%@crm.com';
