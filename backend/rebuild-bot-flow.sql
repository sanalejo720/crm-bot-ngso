-- Reconstruir el flujo del bot con enlaces correctos
-- Basado en un flujo lógico de cobranza:
-- 1. Saludo y Tratamiento -> Validar Aceptación (condition)
-- 2. Validar Aceptación -> SI: Solicitar Documento | NO: Rechazo de Tratamiento
-- 3. Solicitar Documento -> Capturar Documento (input)
-- 4. Capturar Documento -> Evaluar Documento (condition - necesitamos crear o usar uno)
-- 5. Evaluar válido -> Presentación Deuda
-- 6. Presentación Deuda -> Evaluar Opción (condition)
-- 7. Evaluar Opción -> Opciones de pago o transferir

-- Primero, limpiar todos los nextNodeId
UPDATE bot_nodes 
SET "nextNodeId" = NULL
WHERE "flowId" = 'ab8937f9-cc0c-4d5a-98c7-689600fbd54f';

-- 1. Saludo -> Validar Aceptación
UPDATE bot_nodes 
SET "nextNodeId" = '4ed221a1-7f42-4e9b-8f90-ad13ae3ead43'
WHERE id = '3055cb03-8b70-480a-b944-1a3f21093657';

-- 2. Validar Aceptación tiene branches en config, no nextNodeId directo
-- El config debe tener: { "trueNodeId": "...", "falseNodeId": "..." }
-- Por ahora, dejamos NULL porque es condition

-- 3. Solicitar Documento -> Capturar Documento
UPDATE bot_nodes 
SET "nextNodeId" = '19d187d3-ace8-4358-811b-4f7495676e63'
WHERE id = 'c259118d-024e-41df-a4bc-2d7c8f8a9009';

-- 4. Capturar Documento -> Presentación de Deuda (simplificado)
UPDATE bot_nodes 
SET "nextNodeId" = 'e60fae4c-5a37-4ffb-802b-656553d4197c'
WHERE id = '19d187d3-ace8-4358-811b-4f7495676e63';

-- 5. Presentación de Deuda -> Evaluar Opción
UPDATE bot_nodes 
SET "nextNodeId" = 'f1bf258f-7000-46f1-9282-0d77c97f6365'
WHERE id = 'e60fae4c-5a37-4ffb-802b-656553d4197c';

-- 6. Documento Inválido -> Solicitar nuevamente
UPDATE bot_nodes 
SET "nextNodeId" = 'c259118d-024e-41df-a4bc-2d7c8f8a9009'
WHERE id = 'f33c7739-a63a-4e12-b349-caba124bcce6';

-- Verificar resultado
SELECT 
    name,
    type,
    "nextNodeId",
    CASE 
        WHEN type = 'condition' THEN '(usa config branches)'
        WHEN type = 'transfer_agent' THEN '(final node)'
        WHEN "nextNodeId" IS NULL THEN '(final node)'
        ELSE '-> ' || (SELECT name FROM bot_nodes WHERE id = bn."nextNodeId")
    END as next_node
FROM bot_nodes bn
WHERE "flowId" = 'ab8937f9-cc0c-4d5a-98c7-689600fbd54f'
ORDER BY "createdAt";
