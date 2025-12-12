-- Crear nuevo flujo con UUIDs válidos
-- Generando UUIDs para cada nodo

-- 1. Desasociar y limpiar
UPDATE whatsapp_numbers SET "botFlowId" = NULL WHERE "botFlowId" = 'ab8937f9-cc0c-4d5a-98c7-689600fbd54f';
DELETE FROM bot_nodes WHERE "flowId" = 'ab8937f9-cc0c-4d5a-98c7-689600fbd54f';
DELETE FROM bot_flows WHERE id = 'ab8937f9-cc0c-4d5a-98c7-689600fbd54f';

-- 2. Crear flujo
INSERT INTO bot_flows (id, name, description, status, "startNodeId", variables, settings, "createdAt", "updatedAt")
VALUES (
    'ab8937f9-cc0c-4d5a-98c7-689600fbd54f',
    'Flujo Cobranza Completo',
    'Flujo automatizado de cobranza con validación',
    'active',
    '10000000-0000-0000-0000-000000000001', -- node-01-inicio
    '{"clientName": "", "clientPhone": "", "debtorDocument": "", "acceptedAuth": false}',
    '{"timeout": 300}',
    NOW(),
    NOW()
);

-- 3. Crear nodos

-- Nodo 1: Inicio
INSERT INTO bot_nodes (id, name, type, config, "nextNodeId", "positionX", "positionY", "flowId")
VALUES (
    '10000000-0000-0000-0000-000000000001',
    'Inicio - Saludo',
    'message',
    '{"message": "¡Hola! 👋 Soy el asistente de cobranza.\n\nNecesito tu autorización para el tratamiento de datos.\n\n¿Autorizas? Responde:\n1️⃣ Sí, acepto\n2️⃣ No acepto"}',
    '10000000-0000-0000-0000-000000000002',
    100, 100,
    'ab8937f9-cc0c-4d5a-98c7-689600fbd54f'
);

-- Nodo 2: Validar autorización
INSERT INTO bot_nodes (id, name, type, config, "nextNodeId", "positionX", "positionY", "flowId")
VALUES (
    '10000000-0000-0000-0000-000000000002',
    'Validar Autorización',
    'condition',
    '{
        "conditions": [
            {"id": "acepta-si", "variable": "user_response", "operator": "contains_ignore_case", "value": "si", "targetNodeId": "10000000-0000-0000-0000-000000000003"},
            {"id": "acepta-1", "variable": "user_response", "operator": "equals", "value": "1", "targetNodeId": "10000000-0000-0000-0000-000000000003"},
            {"id": "acepta-acepto", "variable": "user_response", "operator": "contains_ignore_case", "value": "acepto", "targetNodeId": "10000000-0000-0000-0000-000000000003"}
        ],
        "defaultNodeId": "10000000-0000-0000-0000-000000000099"
    }',
    NULL,
    200, 100,
    'ab8937f9-cc0c-4d5a-98c7-689600fbd54f'
);

-- Nodo 3: Solicitar documento
INSERT INTO bot_nodes (id, name, type, config, "nextNodeId", "positionX", "positionY", "flowId")
VALUES (
    '10000000-0000-0000-0000-000000000003',
    'Solicitar Documento',
    'message',
    '{"message": "Perfecto ✅\n\nPor favor ingresa tu número de documento (cédula, NIT, etc.)"}',
    '10000000-0000-0000-0000-000000000004',
    300, 100,
    'ab8937f9-cc0c-4d5a-98c7-689600fbd54f'
);

-- Nodo 4: Capturar documento
INSERT INTO bot_nodes (id, name, type, config, "nextNodeId", "positionX", "positionY", "flowId")
VALUES (
    '10000000-0000-0000-0000-000000000004',
    'Capturar Documento',
    'input',
    '{"variableName": "debtorDocument", "validation": {"type": "regex", "pattern": "^[0-9]{6,12}$"}, "timeout": 120}',
    '10000000-0000-0000-0000-000000000005',
    400, 100,
    'ab8937f9-cc0c-4d5a-98c7-689600fbd54f'
);

-- Nodo 5: Mensaje de búsqueda
INSERT INTO bot_nodes (id, name, type, config, "nextNodeId", "positionX", "positionY", "flowId")
VALUES (
    '10000000-0000-0000-0000-000000000005',
    'Buscar Deudor',
    'message',
    '{"message": "🔍 Buscando tu información... Un momento por favor."}',
    '10000000-0000-0000-0000-000000000007',
    500, 100,
    'ab8937f9-cc0c-4d5a-98c7-689600fbd54f'
);

-- Nodo 7: Presentar deuda (simplificado - sin validación de si existe)
INSERT INTO bot_nodes (id, name, type, config, "nextNodeId", "positionX", "positionY", "flowId")
VALUES (
    '10000000-0000-0000-0000-000000000007',
    'Presentar Deuda',
    'message',
    '{"message": "📋 Información encontrada\n\nTenemos opciones de pago disponibles. ¿Deseas conocerlas?\n\n1️⃣ Hablar con asesor\n2️⃣ Métodos de pago\n3️⃣ Plan de pagos"}',
    '10000000-0000-0000-0000-000000000009',
    600, 100,
    'ab8937f9-cc0c-4d5a-98c7-689600fbd54f'
);

-- Nodo 9: Evaluar opción
INSERT INTO bot_nodes (id, name, type, config, "nextNodeId", "positionX", "positionY", "flowId")
VALUES (
    '10000000-0000-0000-0000-000000000009',
    'Evaluar Opción',
    'condition',
    '{
        "conditions": [
            {"id": "opcion-1", "variable": "user_response", "operator": "contains", "value": "1", "targetNodeId": "10000000-0000-0000-0000-000000000010"},
            {"id": "opcion-2", "variable": "user_response", "operator": "contains", "value": "2", "targetNodeId": "10000000-0000-0000-0000-000000000011"},
            {"id": "opcion-3", "variable": "user_response", "operator": "contains", "value": "3", "targetNodeId": "10000000-0000-0000-0000-000000000010"}
        ],
        "defaultNodeId": "10000000-0000-0000-0000-000000000010"
    }',
    NULL,
    700, 100,
    'ab8937f9-cc0c-4d5a-98c7-689600fbd54f'
);

-- Nodo 10: Transferir a agente
INSERT INTO bot_nodes (id, name, type, config, "nextNodeId", "positionX", "positionY", "flowId")
VALUES (
    '10000000-0000-0000-0000-000000000010',
    'Transferir a Agente',
    'transfer_agent',
    '{"message": "Te conecto con un asesor ⏳", "skills": ["cobranza"], "priority": "normal"}',
    NULL,
    800, 100,
    'ab8937f9-cc0c-4d5a-98c7-689600fbd54f'
);

-- Nodo 11: Métodos de pago
INSERT INTO bot_nodes (id, name, type, config, "nextNodeId", "positionX", "positionY", "flowId")
VALUES (
    '10000000-0000-0000-0000-000000000011',
    'Métodos de Pago',
    'message',
    '{"message": "💳 Métodos disponibles:\n\n✅ Transferencia\n✅ PSE\n✅ Tarjeta\n✅ Efectivo\n\n¿Deseas hablar con un asesor?"}',
    '10000000-0000-0000-0000-000000000012',
    800, 200,
    'ab8937f9-cc0c-4d5a-98c7-689600fbd54f'
);

-- Nodo 12: Preguntar asesor
INSERT INTO bot_nodes (id, name, type, config, "nextNodeId", "positionX", "positionY", "flowId")
VALUES (
    '10000000-0000-0000-0000-000000000012',
    'Preguntar Asesor',
    'condition',
    '{
        "conditions": [
            {"id": "si-asesor", "variable": "user_response", "operator": "contains_ignore_case", "value": "si", "targetNodeId": "10000000-0000-0000-0000-000000000010"}
        ],
        "defaultNodeId": "10000000-0000-0000-0000-000000000013"
    }',
    NULL,
    900, 200,
    'ab8937f9-cc0c-4d5a-98c7-689600fbd54f'
);

-- Nodo 13: Despedida
INSERT INTO bot_nodes (id, name, type, config, "nextNodeId", "positionX", "positionY", "flowId")
VALUES (
    '10000000-0000-0000-0000-000000000013',
    'Despedida',
    'message',
    '{"message": "¡Gracias! 😊\n\nSi necesitas ayuda, escríbenos nuevamente.\n\n¡Que tengas un excelente día!"}',
    NULL,
    1000, 200,
    'ab8937f9-cc0c-4d5a-98c7-689600fbd54f'
);

-- Nodo 99: Rechazo
INSERT INTO bot_nodes (id, name, type, config, "nextNodeId", "positionX", "positionY", "flowId")
VALUES (
    '10000000-0000-0000-0000-000000000099',
    'Rechazo Autorización',
    'message',
    '{"message": "Entendido ❌\n\nSin autorización no podemos continuar. Si cambias de opinión, escríbenos.\n\n¡Hasta pronto!"}',
    NULL,
    200, 300,
    'ab8937f9-cc0c-4d5a-98c7-689600fbd54f'
);

-- 4. Actualizar startNodeId
UPDATE bot_flows
SET "startNodeId" = '10000000-0000-0000-0000-000000000001'
WHERE id = 'ab8937f9-cc0c-4d5a-98c7-689600fbd54f';

-- 5. Reasociar a whatsapp_numbers
UPDATE whatsapp_numbers 
SET "botFlowId" = 'ab8937f9-cc0c-4d5a-98c7-689600fbd54f'
WHERE "sessionName" = '573150004497';

-- 6. Verificación
SELECT 'FLUJO' as type, name, "startNodeId" FROM bot_flows WHERE id = 'ab8937f9-cc0c-4d5a-98c7-689600fbd54f';
SELECT 'NODOS' as type, COUNT(*)::text as count FROM bot_nodes WHERE "flowId" = 'ab8937f9-cc0c-4d5a-98c7-689600fbd54f';
SELECT name, type, "nextNodeId" FROM bot_nodes WHERE "flowId" = 'ab8937f9-cc0c-4d5a-98c7-689600fbd54f' ORDER BY name;
