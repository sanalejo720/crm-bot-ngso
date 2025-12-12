-- Verificar estructura del flujo del bot
SELECT 
    id, 
    name, 
    type, 
    "nextNodeId",
    "createdAt"
FROM bot_nodes 
WHERE "flowId" = 'ab8937f9-cc0c-4d5a-98c7-689600fbd54f' 
ORDER BY "createdAt";

-- Verificar el startNodeId del flujo
SELECT 
    id,
    name,
    "startNodeId"
FROM bot_flows
WHERE id = 'ab8937f9-cc0c-4d5a-98c7-689600fbd54f';

-- Verificar chats activos
SELECT 
    id,
    "contactPhone",
    status,
    is_bot_active,
    "botContext"
FROM chats
WHERE is_bot_active = true;
