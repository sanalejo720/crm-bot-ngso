-- Verificar flujo y sus nodos
SELECT 
    f.id as flow_id,
    f.name as flow_name,
    f.start_node_id,
    f.status,
    COUNT(n.id) as total_nodes
FROM bot_flows f
LEFT JOIN bot_nodes n ON n.flow_id = f.id
WHERE f.id = 'ab8937f9-cc0c-4d5a-98c7-689600fbd54f'
GROUP BY f.id, f.name, f.start_node_id, f.status;

-- Ver todos los nodos del flujo
SELECT 
    id,
    name,
    type,
    next_node_id,
    position_x,
    position_y
FROM bot_nodes
WHERE flow_id = 'ab8937f9-cc0c-4d5a-98c7-689600fbd54f'
ORDER BY position_y, position_x;

-- Verificar si el start_node_id existe
SELECT 
    f.start_node_id,
    CASE 
        WHEN n.id IS NOT NULL THEN 'EXISTS'
        ELSE 'NOT FOUND'
    END as node_exists
FROM bot_flows f
LEFT JOIN bot_nodes n ON n.id = f.start_node_id
WHERE f.id = 'ab8937f9-cc0c-4d5a-98c7-689600fbd54f';
