-- Actualizar el chat actual a estado bot
UPDATE chats 
SET status = 'bot',
    "assignedAgentId" = NULL
WHERE id = '970f82e0-2795-4146-b93a-bd9fe98e0216';

-- Verificar el cambio
SELECT 
  id, 
  status, 
  "assignedAgentId", 
  "contactPhone"
FROM chats 
WHERE id = '970f82e0-2795-4146-b93a-bd9fe98e0216';
