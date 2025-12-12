-- Activar bot en todos los chats activos/bot sin agente asignado
UPDATE chats 
SET is_bot_active = true,
    "botContext" = jsonb_build_object(
      'flowId', 'ab8937f9-cc0c-4d5a-98c7-689600fbd54f',
      'currentNodeId', '3055cb03-8b70-480a-b944-1a3f21093657',
      'variables', '{}'::jsonb,
      'transferredToAgent', false
    )
WHERE status IN ('bot', 'waiting') 
  AND "assignedAgentId" IS NULL
  AND is_bot_active = false;

-- Verificar
SELECT id, "contactName", "contactPhone", status, is_bot_active, "botContext"->'flowId' as flow_id
FROM chats 
WHERE is_bot_active = true
ORDER BY "createdAt" DESC 
LIMIT 5;
