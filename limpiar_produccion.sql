-- Script para limpiar datos de prueba - Producción NGS&O CRM
-- MANTIENE: Superadmins, Supervisores, Agentes del Excel
-- ELIMINA: Agentes de prueba, chats, mensajes, clientes de prueba

BEGIN;

-- 1. Eliminar mensajes (dependen de chats)
DELETE FROM messages;

-- 2. Eliminar payment_records
DELETE FROM payment_records;

-- 3. Eliminar agent_pauses
DELETE FROM agent_pauses;

-- 4. Eliminar agent_workdays
DELETE FROM agent_workdays;

-- 5. Eliminar chats
DELETE FROM chats;

-- 6. Eliminar clientes (datos de prueba)
DELETE FROM clients;

-- 7. Eliminar debtors si existe
DELETE FROM debtors WHERE true;

-- 8. Eliminar agentes de prueba (solo los que tienen @prueba en el email)
DELETE FROM users WHERE email LIKE '%prueba%';

-- 9. Verificar usuarios restantes
SELECT id, email, "fullName", 
       CASE WHEN "isAgent" = true THEN 'Agente' ELSE 'Admin/Super' END as tipo
FROM users 
ORDER BY "isAgent", email;

COMMIT;
