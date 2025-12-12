-- Agregar campos para Twilio en whatsapp_numbers
-- Ejecutar en: crm_ngso_db

-- 1. Agregar nuevo tipo de proveedor 'twilio'
ALTER TYPE public.whatsapp_numbers_provider_enum ADD VALUE IF NOT EXISTS 'twilio';

-- 2. Agregar campos para credenciales de Twilio
ALTER TABLE public.whatsapp_numbers 
ADD COLUMN IF NOT EXISTS "twilioAccountSid" VARCHAR,
ADD COLUMN IF NOT EXISTS "twilioAuthToken" VARCHAR,
ADD COLUMN IF NOT EXISTS "twilioPhoneNumber" VARCHAR;

-- 3. Comentarios para documentar
COMMENT ON COLUMN public.whatsapp_numbers."twilioAccountSid" IS 'Twilio Account SID (ej: ACxxxxx)';
COMMENT ON COLUMN public.whatsapp_numbers."twilioAuthToken" IS 'Twilio Auth Token';
COMMENT ON COLUMN public.whatsapp_numbers."twilioPhoneNumber" IS 'Twilio WhatsApp Number (formato: whatsapp:+14155238886)';

-- Verificar cambios
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'whatsapp_numbers'
  AND column_name LIKE 'twilio%';
