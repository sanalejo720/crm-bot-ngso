-- Ver la configuración de los nodos condition
SELECT 
    name,
    type,
    config
FROM bot_nodes 
WHERE "flowId" = 'ab8937f9-cc0c-4d5a-98c7-689600fbd54f'
  AND type = 'condition';

-- Actualizar config de "Validar Aceptación" 
-- TRUE -> Solicitar Documento | FALSE -> Rechazo de Tratamiento
UPDATE bot_nodes
SET config = jsonb_set(
    jsonb_set(
        COALESCE(config, '{}'::jsonb),
        '{trueNodeId}',
        '"c259118d-024e-41df-a4bc-2d7c8f8a9009"'
    ),
    '{falseNodeId}',
    '"eecb99db-26e7-42cc-be6f-60649eb8cc93"'
)
WHERE id = '4ed221a1-7f42-4e9b-8f90-ad13ae3ead43';

-- Actualizar config de "Evaluar Opción"
-- Por ejemplo: opción 1 -> algo, opción 2 -> Transferir a Asesor
UPDATE bot_nodes
SET config = jsonb_set(
    COALESCE(config, '{}'::jsonb),
    '{branches}',
    '[
        {"condition": "opcion == 1", "nodeId": "cb9b8a7c-cabd-4c94-8a53-bc27b6ef4119"},
        {"condition": "opcion == 2", "nodeId": "cb9b8a7c-cabd-4c94-8a53-bc27b6ef4119"}
    ]'::jsonb
)
WHERE id = 'f1bf258f-7000-46f1-9282-0d77c97f6365';

-- Verificar
SELECT 
    name,
    type,
    config
FROM bot_nodes 
WHERE "flowId" = 'ab8937f9-cc0c-4d5a-98c7-689600fbd54f'
  AND type = 'condition';
