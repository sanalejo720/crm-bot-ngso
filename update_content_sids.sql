-- Actualizar nodos del bot con Content SIDs de Twilio

-- Nodo 1: Saludo y Autorización - HX7f13e4ba462423cc300c459db30ad2c9
UPDATE bot_nodes 
SET config = jsonb_set(
  config::jsonb,
  '{contentSid}',
  '"HX7f13e4ba462423cc300c459db30ad2c9"'
)
WHERE id = '10000000-0000-0000-0000-000000000001';

-- Nodo 3: Confirmación y Solicitar Documento - HXb77e06a1335845793e9a4dc12014d41c
UPDATE bot_nodes 
SET config = jsonb_set(
  config::jsonb,
  '{contentSid}',
  '"HXb77e06a1335845793e9a4dc12014d41c"'
)
WHERE id = '10000000-0000-0000-0000-000000000003';

-- Nodo 7: Presentar Información Deuda - HXdd6151611fdf0ec094235522ab67d34a
-- También agregar el mapeo de variables
UPDATE bot_nodes 
SET config = jsonb_set(
  jsonb_set(
    config::jsonb,
    '{contentSid}',
    '"HXdd6151611fdf0ec094235522ab67d34a"'
  ),
  '{contentVariables}',
  '{"1": "debtor_nombre", "2": "debtor_valor_deuda", "3": "debtor_campana"}'
)
WHERE id = '10000000-0000-0000-0000-000000000007';

-- Verificar los cambios
SELECT id, name, config->>'contentSid' as content_sid, config->>'contentVariables' as variables
FROM bot_nodes 
WHERE id IN (
  '10000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000003',
  '10000000-0000-0000-0000-000000000007'
);
