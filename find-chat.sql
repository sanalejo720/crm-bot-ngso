SELECT 
  c.id, 
  c."externalId", 
  c."contactName",
  COUNT(m.id) as total_messages
FROM chats c 
LEFT JOIN messages m ON m."chatId" = c.id 
WHERE c."externalId" LIKE '%573116860369%'
GROUP BY c.id, c."externalId", c."contactName"
LIMIT 5;
