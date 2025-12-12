-- Crear flujo de bot básico con nodos simples
BEGIN;

-- 1. Eliminar flujo viejo si existe
DELETE FROM bot_flows WHERE id = 'ab8937f9-cc0c-4d5a-98c7-689600fbd54f';

-- 2. Crear flujo nuevo
INSERT INTO bot_flows (id, name, description, status, "isActive", "createdAt", "updatedAt")
VALUES (
  'ab8937f9-cc0c-4d5a-98c7-689600fbd54f',
  'Flujo de Cobranza',
  'Flujo automatizado para gestión de cobranza',
  'active',
  true,
  NOW(),
  NOW()
);

-- 3. Crear nodo de bienvenida (INICIO)
INSERT INTO bot_nodes (id, "flowId", type, name, config, "createdAt", "updatedAt")
VALUES (
  '09bebfbf-78ef-41ce-9c8b-faf53d2d689e',
  'ab8937f9-cc0c-4d5a-98c7-689600fbd54f',
  'message',
  'Bienvenida',
  '{"message":"¡Hola! 👋 Soy el asistente virtual de cobranza. ¿En qué puedo ayudarte hoy?\n\n1️⃣ Consultar estado de cuenta\n2️⃣ Hablar con un asesor\n3️⃣ Acordar plan de pago","responseNodeId":"11111111-1111-1111-1111-111111111111"}',
  NOW(),
  NOW()
);

-- 4. Crear nodo de opciones
INSERT INTO bot_nodes (id, "flowId", type, name, config, "createdAt", "updatedAt")
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'ab8937f9-cc0c-4d5a-98c7-689600fbd54f',
  'condition',
  'Evaluar Opción',
  '{"conditions":[{"variable":"userInput","operator":"contains","value":"1","targetNodeId":"22222222-2222-2222-2222-222222222222"},{"variable":"userInput","operator":"contains","value":"2","targetNodeId":"33333333-3333-3333-3333-333333333333"}],"defaultNodeId":"44444444-4444-4444-4444-444444444444"}',
  NOW(),
  NOW()
);

-- 5. Nodo: Consultar cuenta
INSERT INTO bot_nodes (id, "flowId", type, name, config, "createdAt", "updatedAt")
VALUES (
  '22222222-2222-2222-2222-222222222222',
  'ab8937f9-cc0c-4d5a-98c7-689600fbd54f',
  'message',
  'Consultar Cuenta',
  '{"message":"📊 Para consultar tu estado de cuenta, por favor ingresa tu número de documento (CC o NIT):","responseNodeId":"09bebfbf-78ef-41ce-9c8b-faf53d2d689e"}',
  NOW(),
  NOW()
);

-- 6. Nodo: Transferir a agente
INSERT INTO bot_nodes (id, "flowId", type, name, config, "createdAt", "updatedAt")
VALUES (
  '33333333-3333-3333-3333-333333333333',
  'ab8937f9-cc0c-4d5a-98c7-689600fbd54f',
  'transfer_agent',
  'Transferir a Asesor',
  '{"message":"👤 Te estoy conectando con un asesor. En un momento te atenderá.","reason":"Cliente solicitó hablar con asesor"}',
  NOW(),
  NOW()
);

-- 7. Nodo: Opción no válida
INSERT INTO bot_nodes (id, "flowId", type, name, config, "createdAt", "updatedAt")
VALUES (
  '44444444-4444-4444-4444-444444444444',
  'ab8937f9-cc0c-4d5a-98c7-689600fbd54f',
  'message',
  'Opción Inválida',
  '{"message":"❌ No entendí tu respuesta. Por favor escribe el número de la opción que deseas:\n\n1️⃣ Consultar estado de cuenta\n2️⃣ Hablar con un asesor","responseNodeId":"11111111-1111-1111-1111-111111111111"}',
  NOW(),
  NOW()
);

-- 8. Actualizar el startNodeId del flujo
UPDATE bot_flows 
SET "startNodeId" = '09bebfbf-78ef-41ce-9c8b-faf53d2d689e'
WHERE id = 'ab8937f9-cc0c-4d5a-98c7-689600fbd54f';

COMMIT;

-- Verificar
SELECT 'FLUJO CREADO:' as resultado;
SELECT id, name, "startNodeId", "isActive" FROM bot_flows WHERE id = 'ab8937f9-cc0c-4d5a-98c7-689600fbd54f';

SELECT 'NODOS CREADOS:' as resultado;
SELECT id, type, name FROM bot_nodes WHERE "flowId" = 'ab8937f9-cc0c-4d5a-98c7-689600fbd54f' ORDER BY "createdAt";
