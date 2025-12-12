-- Corregir formato del twilioPhoneNumber
UPDATE whatsapp_numbers 
SET "twilioPhoneNumber" = 'whatsapp:+15557415189'
WHERE id = 'b8f981ce-b994-4e5f-aa1b-96737269861f';

-- Verificar el cambio
SELECT "phoneNumber", "twilioPhoneNumber" FROM whatsapp_numbers WHERE id='b8f981ce-b994-4e5f-aa1b-96737269861f';
