SELECT id, type, direction, "senderType", LEFT(content, 50) as content_preview, "sentAt", "createdAt"
FROM messages
WHERE "chatId" = '0ab1430a-472e-43bd-966a-39954bf5c505'
  AND "createdAt" >= '2025-12-04 19:56:00'
ORDER BY "createdAt" DESC;
