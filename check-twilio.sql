-- Verificar números de WhatsApp
SELECT id, "phoneNumber", "displayName", provider, status, "isActive" FROM whatsapp_numbers;

-- Verificar campañas
SELECT id, name, "isActive" FROM campaigns LIMIT 5;
