SELECT m.id, m."chatId", m.content, m.status, m."externalId", m.metadata, m."createdAt", c."contactPhone"
FROM messages m
JOIN chats c ON c.id = m."chatId"
WHERE c."contactPhone" IN ('573224117710', '573334309474')
AND m.direction = 'outbound'
ORDER BY m."createdAt" DESC
LIMIT 10;
