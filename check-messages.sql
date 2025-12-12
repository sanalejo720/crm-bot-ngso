-- Ver mensajes recientes
SELECT id, "chatId", content, direction, "createdAt" 
FROM messages 
ORDER BY "createdAt" DESC 
LIMIT 10;

-- Ver chats recientes
SELECT id, "contactPhone", "contactName", status, "lastMessageText", "createdAt" 
FROM chats 
ORDER BY "createdAt" DESC 
LIMIT 10;
