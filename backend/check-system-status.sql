-- Verificar estado actual del sistema antes de la prueba
SELECT 'SESIONES DE WHATSAPP:' as info;
SELECT "sessionName", "phoneNumber", status, "botFlowId" IS NOT NULL as tiene_bot
FROM whatsapp_numbers 
WHERE "isActive" = true;

SELECT 'FLUJO DE BOT:' as info;
SELECT name, "startNodeId", "isActive" 
FROM bot_flows 
WHERE id = 'ab8937f9-cc0c-4d5a-98c7-689600fbd54f';

SELECT 'NODOS DEL FLUJO:' as info;
SELECT id, type, name 
FROM bot_nodes 
WHERE "flowId" = 'ab8937f9-cc0c-4d5a-98c7-689600fbd54f'
ORDER BY "createdAt"
LIMIT 5;

SELECT 'AGENTES DISPONIBLES:' as info;
SELECT "fullName", "agentState", "currentChatsCount", "maxConcurrentChats"
FROM users 
WHERE "isAgent" = true;

SELECT 'CHATS ACTUALES:' as info;
SELECT COUNT(*) as total_chats FROM chats;
