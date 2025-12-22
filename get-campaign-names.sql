-- Ver las campañas con chats sin mensajes
SELECT DISTINCT
  c.metadata->>'campaignName' as campaign_name,
  COUNT(*) as total_chats
FROM chats c
WHERE c.metadata->>'source' = 'mass_campaign'
AND NOT EXISTS (SELECT 1 FROM messages m WHERE m."chatId" = c.id)
GROUP BY c.metadata->>'campaignName';
