UPDATE bot_nodes 
SET config = jsonb_set(
  jsonb_set(
    config,
    '{contentSid}',
    '"HX471fdf2924ae6eca57364eaa54d23aad"'
  ),
  '{message}',
  '"✅ Hemos encontrado información asociada a tu documento:\n\n• Nombre: {{debtor_nombre}}\n• Compañía: {{debtor_compania}}\n• Campaña: {{debtor_campana}}\n• Correo: {{debtor_correo}}\n• Teléfono: {{debtor_telefono}}\n• Estado: {{debtor_estado}}\n\nA continuación, te comunicaremos con uno de nuestros asesores para revisar tu caso y ofrecerte alternativas de solución."'
)
WHERE id = '10000000-0000-0000-0000-000000000007';

SELECT id, name, config->'contentSid' as content_sid, config->'message' as message 
FROM bot_nodes 
WHERE id = '10000000-0000-0000-0000-000000000007';
