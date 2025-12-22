-- Verificar mensajes del chat específico
SELECT 
  m.id,
  m."createdAt",
  LEFT(m.content, 80) as content_preview,
  m.direction,
  m."senderType",
  m.metadata
FROM messages m 
WHERE m."chatId" IN (
  SELECT id FROM chats WHERE "externalId" LIKE '%573116860369%'
)
ORDER BY m."createdAt" ASC;
