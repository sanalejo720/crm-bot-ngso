-- Contar chats de campaña masiva sin mensajes
SELECT 
  COUNT(*) as chats_sin_mensajes
FROM chats c
WHERE c.metadata->>'source' = 'mass_campaign'
AND NOT EXISTS (
  SELECT 1 FROM messages m WHERE m."chatId" = c.id
);
