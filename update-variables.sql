-- Actualizar nodo completo con nueva plantilla de Twilio
UPDATE bot_nodes 
SET config = jsonb_set(
  jsonb_set(
    jsonb_set(
      config,
      '{contentSid}',
      '"HX471fdf2924ae6eca57364eaa54d23aad"'
    ),
    '{contentVariables}',
    '{"1": "debtor_nombre", "2": "debtor_campana"}'::jsonb
  ),
  '{message}',
  '"📊 *Información de tu Obligación*\n\n👤 Cliente: {{debtor_nombre}}\n🏢 Campaña: {{debtor_campana}}\n\n¿Qué deseas hacer?"'
)
WHERE id = '10000000-0000-0000-0000-000000000007';

-- Verificar el resultado
SELECT id, name, 
  config->'contentSid' as content_sid, 
  config->'contentVariables' as content_variables,
  config->'message' as message
FROM bot_nodes 
WHERE id = '10000000-0000-0000-0000-000000000007';
