-- Eliminar datos de prueba del número 573334309474
-- Ejecutar con: psql -U crm_user -d crm_db -f limpiar-prueba.sql

-- 1. Eliminar mensajes asociados
DELETE FROM messages 
WHERE "chatId" IN (
  SELECT id FROM chats WHERE "contactPhone" LIKE '573334309474%'
);

-- 2. Eliminar chats
DELETE FROM chats 
WHERE "contactPhone" LIKE '573334309474%';

-- 3. Eliminar clientes
DELETE FROM clients 
WHERE phone = '573334309474';

-- 4. Verificar que quedó limpio
SELECT 'Chats restantes' as tabla, COUNT(*) as cantidad FROM chats WHERE "contactPhone" LIKE '573334309474%'
UNION ALL
SELECT 'Mensajes restantes', COUNT(*) FROM messages WHERE "chatId" IN (SELECT id FROM chats WHERE "contactPhone" LIKE '573334309474%')
UNION ALL
SELECT 'Clientes restantes', COUNT(*) FROM clients WHERE phone = '573334309474';

-- Mostrar el deudor que debe permanecer
SELECT 'Deudor (debe existir)' as info, "fullName", phone, "debtAmount", "daysOverdue" 
FROM debtors 
WHERE phone = '573334309474';
