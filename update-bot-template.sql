-- Actualizar nodo de información de deuda con nueva plantilla
-- Sin valor de deuda, solo: nombre, compañía y campaña

UPDATE bot_nodes
SET 
  "contentSid" = 'HX471fdf2924ae6eca57364eaa54d23aad',
  config = jsonb_set(
    config,
    '{contentVariables}',
    '{"1": "clientName", "2": "company", "3": "campaign"}'::jsonb
  ),
  "updatedAt" = NOW()
WHERE id = '10000000-0000-0000-0000-000000000007';

-- Verificar el cambio
SELECT 
  id,
  name,
  type,
  "contentSid",
  config->'contentVariables' as variables,
  "updatedAt"
FROM bot_nodes
WHERE id = '10000000-0000-0000-0000-000000000007';
