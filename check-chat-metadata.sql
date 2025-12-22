SELECT 
  c.id,
  c."externalId",
  c."contactName",
  c.metadata
FROM chats c
WHERE c.metadata->>'source' = 'mass_campaign'
LIMIT 3;
