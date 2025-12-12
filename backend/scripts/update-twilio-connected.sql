-- Actualizar números Twilio con credenciales a estado conectado
UPDATE whatsapp_numbers 
SET status = 'connected' 
WHERE provider = 'twilio' 
  AND "twilioAccountSid" IS NOT NULL 
  AND "twilioAuthToken" IS NOT NULL 
  AND "twilioPhoneNumber" IS NOT NULL;

-- Verificar cambios
SELECT id, "displayName", provider, status, "twilioPhoneNumber"
FROM whatsapp_numbers 
WHERE provider = 'twilio';
