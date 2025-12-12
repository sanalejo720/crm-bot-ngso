-- Verificar el estado actual del chat y mensajes
SELECT 
    c.id,
    c."contactPhone",
    c.status,
    c.is_bot_active,
    c."botContext"->>'currentNodeId' as current_node,
    c."lastMessageText",
    c."lastMessageAt"
FROM chats c
WHERE c."contactPhone" = '126818170482726'
ORDER BY c."createdAt" DESC;

-- Ver los últimos mensajes del chat
SELECT 
    m.id,
    m.type,
    m.direction,
    m."senderType",
    m.content,
    m.status,
    m."createdAt",
    m."errorMessage"
FROM messages m
WHERE m."chatId" IN (
    SELECT id FROM chats WHERE "contactPhone" = '126818170482726'
)
ORDER BY m."createdAt" DESC
LIMIT 10;

-- Ver el nodo actual del bot
SELECT 
    bn.id,
    bn.name,
    bn.type,
    bn.config
FROM bot_nodes bn
WHERE bn."flowId" = 'ab8937f9-cc0c-4d5a-98c7-689600fbd54f'
  AND bn.id = '3055cb03-8b70-480a-b944-1a3f21093657';
