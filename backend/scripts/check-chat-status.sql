SELECT 
  id, 
  status, 
  "assignedAgentId", 
  "contactPhone",
  "createdAt"
FROM chats 
WHERE "contactPhone" LIKE '%573334309474%' 
ORDER BY "createdAt" DESC 
LIMIT 3;
