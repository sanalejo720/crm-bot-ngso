-- Crear un nuevo flujo de bot desde cero basado en el diagrama
-- Este flujo reemplazará el flujo actual que tiene problemas

-- 1. Desasociar el flujo de whatsapp_numbers primero
UPDATE whatsapp_numbers SET "botFlowId" = NULL WHERE "botFlowId" = 'ab8937f9-cc0c-4d5a-98c7-689600fbd54f';

-- 2. Eliminar el flujo antiguo si existe
DELETE FROM bot_nodes WHERE "flowId" = 'ab8937f9-cc0c-4d5a-98c7-689600fbd54f';
DELETE FROM bot_flows WHERE id = 'ab8937f9-cc0c-4d5a-98c7-689600fbd54f';

-- 2. Crear el nuevo flujo
INSERT INTO bot_flows (id, name, description, status, "startNodeId", variables, settings, "createdAt", "updatedAt")
VALUES (
    'ab8937f9-cc0c-4d5a-98c7-689600fbd54f',
    'Flujo Cobranza Completo',
    'Flujo automatizado de cobranza con validación de autorización y gestión de documentos',
    'active',
    NULL, -- Lo actualizaremos después
    '{"clientName": "", "clientPhone": "", "debtorDocument": "", "acceptedAuth": false, "debtAmount": 0}',
    '{"timeout": 300, "maxRetries": 3}',
    NOW(),
    NOW()
);

-- 3. Crear los nodos del flujo (en orden lógico)

-- Nodo 1: Inicio - Saludo y solicitud de autorización
INSERT INTO bot_nodes (id, name, type, config, "nextNodeId", "positionX", "positionY", "flowId", "createdAt", "updatedAt")
VALUES (
    'node-01-inicio',
    'Inicio - Saludo',
    'message',
    '{
        "message": "¡Hola! 👋 Soy el asistente virtual de cobranza.\n\nPara continuar, necesito tu autorización para el tratamiento de tus datos personales según la Ley 1581 de 2012.\n\n¿Autorizas el tratamiento de tus datos? Responde:\n1️⃣ Sí, acepto\n2️⃣ No acepto"
    }',
    'node-02-validar-autorizacion',
    100,
    100,
    'ab8937f9-cc0c-4d5a-98c7-689600fbd54f',
    NOW(),
    NOW()
);

-- Nodo 2: Validar autorización (condition)
INSERT INTO bot_nodes (id, name, type, config, "nextNodeId", "positionX", "positionY", "flowId", "createdAt", "updatedAt")
VALUES (
    'node-02-validar-autorizacion',
    'Validar Autorización',
    'condition',
    '{
        "conditions": [
            {
                "id": "acepta-si",
                "variable": "user_response",
                "operator": "contains_ignore_case",
                "value": "si",
                "targetNodeId": "node-03-solicitar-documento"
            },
            {
                "id": "acepta-1",
                "variable": "user_response",
                "operator": "equals",
                "value": "1",
                "targetNodeId": "node-03-solicitar-documento"
            },
            {
                "id": "acepta-acepto",
                "variable": "user_response",
                "operator": "contains_ignore_case",
                "value": "acepto",
                "targetNodeId": "node-03-solicitar-documento"
            }
        ],
        "defaultNodeId": "node-99-rechazo"
    }',
    NULL,
    200,
    100,
    'ab8937f9-cc0c-4d5a-98c7-689600fbd54f',
    NOW(),
    NOW()
);

-- Nodo 3: Solicitar documento
INSERT INTO bot_nodes (id, name, type, config, "nextNodeId", "positionX", "positionY", "flowId", "createdAt", "updatedAt")
VALUES (
    'node-03-solicitar-documento',
    'Solicitar Documento',
    'message',
    '{
        "message": "Perfecto, gracias por tu autorización. ✅\n\nPor favor, ingresa tu número de documento (cédula, NIT, etc.) para buscar tu información en nuestra base de datos."
    }',
    'node-04-capturar-documento',
    300,
    100,
    'ab8937f9-cc0c-4d5a-98c7-689600fbd54f',
    NOW(),
    NOW()
);

-- Nodo 4: Capturar documento (input)
INSERT INTO bot_nodes (id, name, type, config, "nextNodeId", "positionX", "positionY", "flowId", "createdAt", "updatedAt")
VALUES (
    'node-04-capturar-documento',
    'Capturar Documento',
    'input',
    '{
        "variableName": "debtorDocument",
        "validation": {
            "type": "regex",
            "pattern": "^[0-9]{6,12}$",
            "errorMessage": "Por favor ingresa un número de documento válido (solo números, entre 6 y 12 dígitos)"
        },
        "timeout": 120
    }',
    'node-05-buscar-deudor',
    400,
    100,
    'ab8937f9-cc0c-4d5a-98c7-689600fbd54f',
    NOW(),
    NOW()
);

-- Nodo 5: Buscar deudor en base de datos (api_call o logic)
INSERT INTO bot_nodes (id, name, type, config, "nextNodeId", "positionX", "positionY", "flowId", "createdAt", "updatedAt")
VALUES (
    'node-05-buscar-deudor',
    'Buscar Deudor',
    'api_call',
    '{
        "endpoint": "/api/debtors/search",
        "method": "GET",
        "params": {
            "documentNumber": "{{debtorDocument}}"
        },
        "responseMapping": {
            "debtorFound": "exists",
            "debtorName": "fullName",
            "debtAmount": "debtAmount",
            "daysOverdue": "daysOverdue"
        }
    }',
    'node-06-validar-deudor-existe',
    500,
    100,
    'ab8937f9-cc0c-4d5a-98c7-689600fbd54f',
    NOW(),
    NOW()
);

-- Nodo 6: Validar si el deudor existe (condition)
INSERT INTO bot_nodes (id, name, type, config, "nextNodeId", "positionX", "positionY", "flowId", "createdAt", "updatedAt")
VALUES (
    'node-06-validar-deudor-existe',
    'Validar Deudor Existe',
    'condition',
    '{
        "conditions": [
            {
                "id": "deudor-encontrado",
                "variable": "debtorFound",
                "operator": "equals",
                "value": true,
                "targetNodeId": "node-07-presentar-deuda"
            }
        ],
        "defaultNodeId": "node-98-deudor-no-encontrado"
    }',
    NULL,
    600,
    100,
    'ab8937f9-cc0c-4d5a-98c7-689600fbd54f',
    NOW(),
    NOW()
);

-- Nodo 7: Presentar información de la deuda
INSERT INTO bot_nodes (id, name, type, config, "nextNodeId", "positionX", "positionY", "flowId", "createdAt", "updatedAt")
VALUES (
    'node-07-presentar-deuda',
    'Presentar Deuda',
    'message',
    '{
        "message": "📋 *Información de tu cuenta*\n\n👤 Titular: {{debtorName}}\n💰 Monto adeudado: ${{debtAmount}}\n📅 Días de mora: {{daysOverdue}}\n\nTenemos opciones de pago disponibles para ti. ¿Deseas conocerlas?"
    }',
    'node-08-ofrecer-opciones',
    700,
    100,
    'ab8937f9-cc0c-4d5a-98c7-689600fbd54f',
    NOW(),
    NOW()
);

-- Nodo 8: Ofrecer opciones de pago
INSERT INTO bot_nodes (id, name, type, config, "nextNodeId", "positionX", "positionY", "flowId", "createdAt", "updatedAt")
VALUES (
    'node-08-ofrecer-opciones',
    'Ofrecer Opciones',
    'message',
    '{
        "message": "Elige una opción:\n\n1️⃣ Hablar con un asesor\n2️⃣ Información sobre métodos de pago\n3️⃣ Solicitar plan de pagos"
    }',
    'node-09-evaluar-opcion',
    800,
    100,
    'ab8937f9-cc0c-4d5a-98c7-689600fbd54f',
    NOW(),
    NOW()
);

-- Nodo 9: Evaluar opción elegida (condition)
INSERT INTO bot_nodes (id, name, type, config, "nextNodeId", "positionX", "positionY", "flowId", "createdAt", "updatedAt")
VALUES (
    'node-09-evaluar-opcion',
    'Evaluar Opción',
    'condition',
    '{
        "conditions": [
            {
                "id": "opcion-1-asesor",
                "variable": "user_response",
                "operator": "contains",
                "value": "1",
                "targetNodeId": "node-10-transferir-agente"
            },
            {
                "id": "opcion-2-metodos",
                "variable": "user_response",
                "operator": "contains",
                "value": "2",
                "targetNodeId": "node-11-metodos-pago"
            },
            {
                "id": "opcion-3-plan",
                "variable": "user_response",
                "operator": "contains",
                "value": "3",
                "targetNodeId": "node-10-transferir-agente"
            }
        ],
        "defaultNodeId": "node-10-transferir-agente"
    }',
    NULL,
    900,
    100,
    'ab8937f9-cc0c-4d5a-98c7-689600fbd54f',
    NOW(),
    NOW()
);

-- Nodo 10: Transferir a agente
INSERT INTO bot_nodes (id, name, type, config, "nextNodeId", "positionX", "positionY", "flowId", "createdAt", "updatedAt")
VALUES (
    'node-10-transferir-agente',
    'Transferir a Agente',
    'transfer_agent',
    '{
        "message": "Un momento por favor, te estoy conectando con uno de nuestros asesores especializados. ⏳",
        "skills": ["cobranza"],
        "priority": "normal"
    }',
    NULL,
    1000,
    100,
    'ab8937f9-cc0c-4d5a-98c7-689600fbd54f',
    NOW(),
    NOW()
);

-- Nodo 11: Información de métodos de pago
INSERT INTO bot_nodes (id, name, type, config, "nextNodeId", "positionX", "positionY", "flowId", "createdAt", "updatedAt")
VALUES (
    'node-11-metodos-pago',
    'Métodos de Pago',
    'message',
    '{
        "message": "💳 *Métodos de pago disponibles:*\n\n✅ Transferencia bancaria\n✅ PSE\n✅ Tarjeta de crédito/débito\n✅ Efectivo en puntos autorizados\n\n¿Deseas que un asesor te ayude con el proceso de pago?"
    }',
    'node-12-preguntar-asesor',
    1000,
    200,
    'ab8937f9-cc0c-4d5a-98c7-689600fbd54f',
    NOW(),
    NOW()
);

-- Nodo 12: Preguntar si necesita asesor
INSERT INTO bot_nodes (id, name, type, config, "nextNodeId", "positionX", "positionY", "flowId", "createdAt", "updatedAt")
VALUES (
    'node-12-preguntar-asesor',
    'Preguntar Asesor',
    'condition',
    '{
        "conditions": [
            {
                "id": "si-asesor",
                "variable": "user_response",
                "operator": "contains_ignore_case",
                "value": "si",
                "targetNodeId": "node-10-transferir-agente"
            }
        ],
        "defaultNodeId": "node-13-despedida"
    }',
    NULL,
    1100,
    200,
    'ab8937f9-cc0c-4d5a-98c7-689600fbd54f',
    NOW(),
    NOW()
);

-- Nodo 13: Despedida
INSERT INTO bot_nodes (id, name, type, config, "nextNodeId", "positionX", "positionY", "flowId", "createdAt", "updatedAt")
VALUES (
    'node-13-despedida',
    'Despedida',
    'message',
    '{
        "message": "¡Gracias por tu atención! 😊\n\nSi necesitas más información, no dudes en escribirnos nuevamente.\n\n¡Que tengas un excelente día!"
    }',
    NULL,
    1200,
    200,
    'ab8937f9-cc0c-4d5a-98c7-689600fbd54f',
    NOW(),
    NOW()
);

-- Nodo 98: Deudor no encontrado
INSERT INTO bot_nodes (id, name, type, config, "nextNodeId", "positionX", "positionY", "flowId", "createdAt", "updatedAt")
VALUES (
    'node-98-deudor-no-encontrado',
    'Deudor No Encontrado',
    'message',
    '{
        "message": "⚠️ No encontramos registros con el documento ingresado.\n\nPor favor verifica el número o comunícate con uno de nuestros asesores para más información."
    }',
    'node-10-transferir-agente',
    600,
    300,
    'ab8937f9-cc0c-4d5a-98c7-689600fbd54f',
    NOW(),
    NOW()
);

-- Nodo 99: Rechazo de autorización
INSERT INTO bot_nodes (id, name, type, config, "nextNodeId", "positionX", "positionY", "flowId", "createdAt", "updatedAt")
VALUES (
    'node-99-rechazo',
    'Rechazo Autorización',
    'message',
    '{
        "message": "Entendemos tu decisión. ❌\n\nSin tu autorización no podemos procesar tu información. Si cambias de opinión, puedes escribirnos nuevamente.\n\n¡Hasta pronto!"
    }',
    NULL,
    200,
    300,
    'ab8937f9-cc0c-4d5a-98c7-689600fbd54f',
    NOW(),
    NOW()
);

-- 4. Actualizar el startNodeId del flujo
UPDATE bot_flows
SET "startNodeId" = 'node-01-inicio'
WHERE id = 'ab8937f9-cc0c-4d5a-98c7-689600fbd54f';

-- 5. Verificar el flujo creado
SELECT 
    'FLUJO CREADO' as status,
    id,
    name,
    "startNodeId"
FROM bot_flows
WHERE id = 'ab8937f9-cc0c-4d5a-98c7-689600fbd54f';

SELECT 
    'NODOS CREADOS' as status,
    COUNT(*) as total_nodos
FROM bot_nodes
WHERE "flowId" = 'ab8937f9-cc0c-4d5a-98c7-689600fbd54f';

SELECT 
    name,
    type,
    "nextNodeId"
FROM bot_nodes
WHERE "flowId" = 'ab8937f9-cc0c-4d5a-98c7-689600fbd54f'
ORDER BY name;
