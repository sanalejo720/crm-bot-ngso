-- Verificación simple del flujo reconstruido
SELECT 
    name,
    type,
    "nextNodeId"
FROM bot_nodes 
WHERE "flowId" = 'ab8937f9-cc0c-4d5a-98c7-689600fbd54f'
ORDER BY "createdAt";
