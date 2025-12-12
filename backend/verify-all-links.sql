-- Verificar todos los nextNodeId y asegurar que existan
WITH all_nodes AS (
    SELECT id::text FROM bot_nodes WHERE "flowId" = 'ab8937f9-cc0c-4d5a-98c7-689600fbd54f'
)
SELECT 
    bn.id,
    bn.name,
    bn.type,
    bn."nextNodeId",
    CASE 
        WHEN bn."nextNodeId" IS NULL THEN 'NULL (final node)'
        WHEN EXISTS (SELECT 1 FROM all_nodes WHERE id = bn."nextNodeId"::text) THEN 'EXISTS'
        ELSE 'NOT FOUND'
    END as next_node_status
FROM bot_nodes bn
WHERE bn."flowId" = 'ab8937f9-cc0c-4d5a-98c7-689600fbd54f'
ORDER BY bn."createdAt";
