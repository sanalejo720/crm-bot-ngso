-- Script para agregar mensajes retroactivos de la campaña masiva
-- Template: vigente_aviso_2 (HX0bb45dfd6b84d0c66db9b684035c74b1)

-- Insertar mensajes para todos los chats de mass_campaign que no tienen mensajes
INSERT INTO messages (
  id,
  "chatId",
  type,
  direction,
  "senderType",
  content,
  status,
  "createdAt",
  metadata
)
SELECT 
  gen_random_uuid() as id,
  c.id as "chatId",
  'text' as type,
  'outbound' as direction,
  'system' as "senderType",
  'Cordial saludo,

NGS&O Abogados, en representación de Investigaciones y Cobranzas El Libertador S.A., le informa que presenta un saldo pendiente de más de 30 días en el pago de los cánones de su contrato de arrendamiento.

📋 Solicitud pendiente de revisión

Es importante regularizar su situación para evitar inconvenientes. Le invitamos a solicitar su link de pago en los próximos 5 días respondiendo a este mensaje.

Atentamente,
NGS&O Abogados' as content,
  'sent' as status,
  COALESCE(
    (c.metadata->>'sentAt')::timestamp,
    c."createdAt"
  ) as "createdAt",
  jsonb_build_object(
    'source', 'retroactive_campaign',
    'templateSid', 'HX0bb45dfd6b84d0c66db9b684035c74b1',
    'templateName', 'vigente_aviso_2',
    'note', 'Mensaje agregado retroactivamente desde campaña masiva'
  ) as metadata
FROM chats c
WHERE c.metadata->>'source' = 'mass_campaign'
AND NOT EXISTS (
  SELECT 1 FROM messages m WHERE m."chatId" = c.id
);

-- Verificar cuántos mensajes se insertaron
SELECT COUNT(*) as mensajes_insertados FROM messages 
WHERE metadata->>'source' = 'retroactive_campaign';
