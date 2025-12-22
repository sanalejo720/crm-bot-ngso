SELECT 
  id,
  name,
  metadata,
  settings,
  status,
  "createdAt"
FROM campaigns
ORDER BY "createdAt" DESC
LIMIT 3;
