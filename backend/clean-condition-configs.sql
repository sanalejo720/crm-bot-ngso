-- Limpiar y establecer configuración correcta para los nodos condition

-- Validar Aceptación: 
-- Si acepta (si, acepto, 1) -> Solicitar Documento (c259118d-024e-41df-a4bc-2d7c8f8a9009)
-- Si rechaza (no, etc) -> Rechazo de Tratamiento (eecb99db-26e7-42cc-be6f-60649eb8cc93)
UPDATE bot_nodes
SET config = '{
    "conditions": [
        {
            "id": "acepto",
            "variable": "user_response",
            "operator": "contains_ignore_case",
            "value": "acepto",
            "targetNodeId": "c259118d-024e-41df-a4bc-2d7c8f8a9009"
        },
        {
            "id": "si",
            "variable": "user_response",
            "operator": "contains_ignore_case",
            "value": "si",
            "targetNodeId": "c259118d-024e-41df-a4bc-2d7c8f8a9009"
        },
        {
            "id": "1",
            "variable": "user_response",
            "operator": "equals",
            "value": "1",
            "targetNodeId": "c259118d-024e-41df-a4bc-2d7c8f8a9009"
        }
    ],
    "defaultNodeId": "eecb99db-26e7-42cc-be6f-60649eb8cc93"
}'::jsonb
WHERE id = '4ed221a1-7f42-4e9b-8f90-ad13ae3ead43';

-- Evaluar Opción:
-- Todas las opciones -> Transferir a Asesor (cb9b8a7c-cabd-4c94-8a53-bc27b6ef4119)
UPDATE bot_nodes
SET config = '{
    "conditions": [
        {
            "id": "1",
            "variable": "opcion",
            "operator": "equals",
            "value": "1",
            "targetNodeId": "cb9b8a7c-cabd-4c94-8a53-bc27b6ef4119"
        },
        {
            "id": "2",
            "variable": "opcion",
            "operator": "equals",
            "value": "2",
            "targetNodeId": "cb9b8a7c-cabd-4c94-8a53-bc27b6ef4119"
        }
    ],
    "defaultNodeId": "cb9b8a7c-cabd-4c94-8a53-bc27b6ef4119"
}'::jsonb
WHERE id = 'f1bf258f-7000-46f1-9282-0d77c97f6365';

-- Verificar
SELECT 
    name,
    type,
    config
FROM bot_nodes 
WHERE "flowId" = 'ab8937f9-cc0c-4d5a-98c7-689600fbd54f'
  AND type = 'condition';
