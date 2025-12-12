-- Agregar columna botFlowId a la tabla whatsapp_numbers
-- Permite asignar un flujo de bot a cada número de WhatsApp

ALTER TABLE whatsapp_numbers 
ADD COLUMN "botFlowId" UUID;

-- Agregar clave foránea hacia la tabla bot_flows
ALTER TABLE whatsapp_numbers
ADD CONSTRAINT fk_whatsapp_numbers_bot_flow
  FOREIGN KEY ("botFlowId") 
  REFERENCES bot_flows(id) 
  ON DELETE SET NULL;

-- Verificación
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'whatsapp_numbers' 
AND column_name = 'botFlowId';
