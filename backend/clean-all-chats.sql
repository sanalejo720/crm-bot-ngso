-- LIMPIEZA COMPLETA: Borrar todos los chats y mensajes para empezar desde cero

BEGIN;

-- 1. Borrar mensajes (deben eliminarse primero por FK)
DELETE FROM messages;

-- 2. Borrar chats
DELETE FROM chats;

-- 3. Borrar clientes si quieres empezar limpio (opcional)
-- DELETE FROM clients;

-- 4. Resetear contadores de agentes
UPDATE users 
SET "currentChatsCount" = 0
WHERE "isAgent" = true;

COMMIT;

-- Verificar limpieza
SELECT 'LIMPIEZA COMPLETADA' as resultado;
SELECT COUNT(*) as chats_restantes FROM chats;
SELECT COUNT(*) as mensajes_restantes FROM messages;
SELECT "fullName", "currentChatsCount", "agentState" FROM users WHERE "isAgent" = true;
