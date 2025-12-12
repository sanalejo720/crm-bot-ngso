-- Verificar credenciales de Twilio
SELECT 
  "twilioAccountSid" IS NOT NULL as has_account_sid, 
  "twilioAuthToken" IS NOT NULL as has_auth_token, 
  "twilioPhoneNumber",
  "campaignId"
FROM whatsapp_numbers 
WHERE id='b8f981ce-b994-4e5f-aa1b-96737269861f';

-- Verificar campañas
SELECT id, name FROM campaigns LIMIT 5;
