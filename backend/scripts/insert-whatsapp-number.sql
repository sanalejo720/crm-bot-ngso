-- Insertar número de WhatsApp con WPPConnect
INSERT INTO whatsapp_numbers (
    id, 
    "phoneNumber", 
    "displayName", 
    provider, 
    status, 
    "sessionName", 
    "isActive", 
    "campaignId", 
    "createdAt", 
    "updatedAt"
) VALUES (
    gen_random_uuid(), 
    '573001234567', 
    'WhatsApp Testing', 
    'wppconnect', 
    'disconnected', 
    'session_crm_01', 
    true, 
    (SELECT id FROM campaigns WHERE name='Campaña Demo 2025'), 
    NOW(), 
    NOW()
) 
RETURNING id, "phoneNumber", "displayName", provider, status;
