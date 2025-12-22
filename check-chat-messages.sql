-- Verificar mensajes del chat activo (primero de la lista)
SELECT 
  m.id,
  m."createdAt",
  m.content,
  m.direction,
  m."senderType"
FROM messages m 
WHERE m."chatId" = '1b88ff84-e729-4bc1-9951-b50553422746'
ORDER BY m."createdAt" ASC;
