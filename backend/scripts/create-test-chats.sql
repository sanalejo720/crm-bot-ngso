-- Crear chat de prueba asignado a Juan Pérez
-- Con el deudor Patricia Gómez (mayor mora)

DO $$
DECLARE
    v_juan_id UUID;
    v_patricia_id UUID;
    v_campaign_id UUID;
    v_chat_id UUID;
BEGIN
    -- Obtener IDs
    SELECT id INTO v_juan_id FROM users WHERE email = 'juan@crm.com';
    SELECT id INTO v_patricia_id FROM clients WHERE "fullName" = 'Patricia Gómez';
    SELECT id INTO v_campaign_id FROM campaigns WHERE name = 'Cobranzas 2025';
    
    -- Crear chat
    INSERT INTO chats (
        id,
        "externalId",
        platform,
        status,
        priority,
        "unreadCount",
        "campaignId",
        "clientId",
        "assignedAgentId",
        "startedAt",
        "createdAt",
        "updatedAt"
    ) VALUES (
        gen_random_uuid(),
        '573001234567@c.us',
        'whatsapp',
        'active',
        100,
        0,
        v_campaign_id,
        v_patricia_id,
        v_juan_id,
        NOW() - INTERVAL '2 hours',
        NOW(),
        NOW()
    ) RETURNING id INTO v_chat_id;
    
    -- Crear algunos mensajes de ejemplo
    INSERT INTO messages (
        id,
        "chatId",
        content,
        direction,
        "senderType",
        status,
        "messageType",
        "createdAt"
    ) VALUES
    (gen_random_uuid(), v_chat_id, 'Hola Patricia, somos del departamento de cobranzas. Te contactamos por tu cuenta pendiente de $5,000,000 con 120 días de mora.', 'outbound', 'bot', 'sent', 'text', NOW() - INTERVAL '2 hours'),
    (gen_random_uuid(), v_chat_id, 'Hola, sí, ya sé que tengo esa deuda pendiente.', 'inbound', 'client', 'read', 'text', NOW() - INTERVAL '1 hour 50 minutes'),
    (gen_random_uuid(), v_chat_id, 'Entiendo tu situación. ¿Cuándo podrías realizar un pago?', 'outbound', 'agent', 'sent', 'text', NOW() - INTERVAL '1 hour 45 minutes'),
    (gen_random_uuid(), v_chat_id, 'Necesito unos días más. ¿Puedo pagar la próxima semana?', 'inbound', 'client', 'read', 'text', NOW() - INTERVAL '30 minutes');
    
    -- Actualizar contador de chats del agente
    UPDATE users SET "currentChatsCount" = "currentChatsCount" + 1 WHERE id = v_juan_id;
    
    RAISE NOTICE 'Chat creado exitosamente para Juan con Patricia';
END $$;

-- Crear otro chat con Roberto Sánchez
DO $$
DECLARE
    v_juan_id UUID;
    v_roberto_id UUID;
    v_campaign_id UUID;
    v_chat_id UUID;
BEGIN
    SELECT id INTO v_juan_id FROM users WHERE email = 'juan@crm.com';
    SELECT id INTO v_roberto_id FROM clients WHERE "fullName" = 'Roberto Sánchez';
    SELECT id INTO v_campaign_id FROM campaigns WHERE name = 'Cobranzas 2025';
    
    INSERT INTO chats (
        id,
        "externalId",
        platform,
        status,
        priority,
        "unreadCount",
        "campaignId",
        "clientId",
        "assignedAgentId",
        "startedAt",
        "createdAt",
        "updatedAt"
    ) VALUES (
        gen_random_uuid(),
        '573009876543@c.us',
        'whatsapp',
        'active',
        90,
        2,
        v_campaign_id,
        v_roberto_id,
        v_juan_id,
        NOW() - INTERVAL '3 hours',
        NOW(),
        NOW()
    ) RETURNING id INTO v_chat_id;
    
    INSERT INTO messages (
        id,
        "chatId",
        content,
        direction,
        "senderType",
        status,
        "messageType",
        "createdAt"
    ) VALUES
    (gen_random_uuid(), v_chat_id, 'Buenos días Roberto. Te contactamos por tu deuda de $3,500,000 con 90 días de mora.', 'outbound', 'bot', 'sent', 'text', NOW() - INTERVAL '3 hours'),
    (gen_random_uuid(), v_chat_id, 'Estoy teniendo problemas económicos', 'inbound', 'client', 'delivered', 'text', NOW() - INTERVAL '2 hours'),
    (gen_random_uuid(), v_chat_id, '¿Cuándo hiciste tu último pago?', 'outbound', 'agent', 'sent', 'text', NOW() - INTERVAL '1 hour'),
    (gen_random_uuid(), v_chat_id, 'Hace como 3 meses', 'inbound', 'client', 'delivered', 'text', NOW() - INTERVAL '45 minutes');
    
    UPDATE users SET "currentChatsCount" = "currentChatsCount" + 1 WHERE id = v_juan_id;
    
    RAISE NOTICE 'Chat creado con Roberto';
END $$;

-- Verificar chats creados
SELECT 
    c.id,
    c."externalId",
    cl."fullName" as cliente,
    c.status,
    c.priority,
    u.email as agente,
    COUNT(m.id) as mensajes
FROM chats c
JOIN clients cl ON c."clientId" = cl.id
JOIN users u ON c."assignedAgentId" = u.id
LEFT JOIN messages m ON m."chatId" = c.id
WHERE u.email = 'juan@crm.com'
GROUP BY c.id, c."externalId", cl."fullName", c.status, c.priority, u.email;
