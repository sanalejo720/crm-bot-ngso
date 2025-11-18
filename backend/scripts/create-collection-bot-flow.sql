-- Crear flujo de bot para cobranzas
INSERT INTO bot_flows (
    id,
    name,
    description,
    status,
    variables,
    settings,
    "createdAt",
    "updatedAt"
) VALUES (
    gen_random_uuid(),
    'Cobranza Automatizada',
    'Flujo de contacto inicial para gestión de cartera vencida',
    'active',
    '{"clientName": "", "debtAmount": 0, "daysOverdue": 0}'::jsonb,
    '{"businessHours": true, "maxRetries": 3}'::jsonb,
    NOW(),
    NOW()
) RETURNING id;

-- Guardar el ID del flujo para los nodos
DO $$
DECLARE
    flow_id uuid;
    node1_id uuid;
    node2_id uuid;
    node3_id uuid;
    node4_id uuid;
    node5_id uuid;
BEGIN
    -- Obtener el ID del flujo recién creado
    SELECT id INTO flow_id FROM bot_flows WHERE name = 'Cobranza Automatizada';
    
    -- Nodo 1: Mensaje de bienvenida
    INSERT INTO bot_nodes (id, name, type, config, "nextNodeId", "positionX", "positionY", "flowId", "createdAt", "updatedAt")
    VALUES (
        gen_random_uuid(),
        'Saludo Inicial',
        'message',
        json_build_object(
            'message', 'Hola {{clientName}}, somos del departamento de cobranzas. Te contactamos por tu cuenta pendiente de ${{debtAmount}} con {{daysOverdue}} días de mora.',
            'delay', 2000
        ),
        NULL,  -- Se actualizará después
        100, 100,
        flow_id,
        NOW(), NOW()
    ) RETURNING id INTO node1_id;
    
    -- Nodo 2: Menú de opciones
    INSERT INTO bot_nodes (id, name, type, config, "nextNodeId", "positionX", "positionY", "flowId", "createdAt", "updatedAt")
    VALUES (
        gen_random_uuid(),
        'Menú Principal',
        'menu',
        json_build_object(
            'message', '¿Qué deseas hacer?',
            'options', json_build_array(
                json_build_object('value', '1', 'label', 'Pagar ahora', 'nextNode', NULL),
                json_build_object('value', '2', 'label', 'Acordar fecha de pago', 'nextNode', NULL),
                json_build_object('value', '3', 'label', 'Hablar con un asesor', 'nextNode', NULL)
            )
        ),
        NULL,
        300, 100,
        flow_id,
        NOW(), NOW()
    ) RETURNING id INTO node2_id;
    
    -- Nodo 3: Solicitar fecha de pago
    INSERT INTO bot_nodes (id, name, type, config, "nextNodeId", "positionX", "positionY", "flowId", "createdAt", "updatedAt")
    VALUES (
        gen_random_uuid(),
        'Solicitar Fecha',
        'input',
        json_build_object(
            'message', 'Por favor indícanos la fecha en que podrás realizar el pago (formato: DD/MM/AAAA)',
            'variable', 'promiseDate',
            'validation', 'date'
        ),
        NULL,
        500, 200,
        flow_id,
        NOW(), NOW()
    ) RETURNING id INTO node3_id;
    
    -- Nodo 4: Confirmar promesa de pago
    INSERT INTO bot_nodes (id, name, type, config, "nextNodeId", "positionX", "positionY", "flowId", "createdAt", "updatedAt")
    VALUES (
        gen_random_uuid(),
        'Confirmar Promesa',
        'message',
        json_build_object(
            'message', 'Perfecto, hemos registrado tu compromiso de pago para el {{promiseDate}}. Te enviaremos un recordatorio ese día.',
            'delay', 1000
        ),
        NULL,
        700, 200,
        flow_id,
        NOW(), NOW()
    ) RETURNING id INTO node4_id;
    
    -- Nodo 5: Transferir a agente
    INSERT INTO bot_nodes (id, name, type, config, "nextNodeId", "positionX", "positionY", "flowId", "createdAt", "updatedAt")
    VALUES (
        gen_random_uuid(),
        'Transferir Agente',
        'transfer_agent',
        json_build_object(
            'message', 'Te estoy conectando con un asesor de cobranzas...',
            'priority', 'high',
            'note', 'Cliente solicitó hablar con asesor'
        ),
        NULL,
        500, 50,
        flow_id,
        NOW(), NOW()
    ) RETURNING id INTO node5_id;
    
    -- Actualizar nextNodeId para crear el flujo
    UPDATE bot_nodes SET "nextNodeId" = node2_id::text WHERE id = node1_id;
    
    -- Actualizar startNodeId del flujo
    UPDATE bot_flows SET "startNodeId" = node1_id::text WHERE id = flow_id;
    
    RAISE NOTICE 'Flujo de cobranza creado exitosamente con ID: %', flow_id;
END $$;

-- Verificar flujo creado
SELECT 
    bf.name as flujo,
    bf.status,
    COUNT(bn.id) as total_nodos
FROM bot_flows bf
LEFT JOIN bot_nodes bn ON bn."flowId" = bf.id
WHERE bf.name = 'Cobranza Automatizada'
GROUP BY bf.id, bf.name, bf.status;

-- Ver nodos del flujo
SELECT 
    bn.name as nodo,
    bn.type as tipo,
    bn.config->>'message' as mensaje
FROM bot_nodes bn
JOIN bot_flows bf ON bn."flowId" = bf.id
WHERE bf.name = 'Cobranza Automatizada'
ORDER BY bn."positionX";
