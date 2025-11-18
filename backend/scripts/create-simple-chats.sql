-- Crear chats de prueba simples para Juan
INSERT INTO chats (
    id,
    "externalId",
    "contactPhone",
    "contactName",
    channel,
    status,
    priority,
    "unreadCount",
    "campaignId",
    "whatsappNumberId",
    "assignedAgentId",
    "clientId",
    "lastMessageText",
    "lastMessageAt",
    "createdAt",
    "updatedAt"
)
SELECT 
    gen_random_uuid(),
    '573001234567@c.us',
    '3001234567',
    'Patricia Gómez',
    'whatsapp',
    'active',
    100,
    0,
    (SELECT id FROM campaigns WHERE name = 'Cobranzas 2025' LIMIT 1),
    (SELECT id FROM whatsapp_numbers LIMIT 1),
    (SELECT id FROM users WHERE email = 'juan@crm.com'),
    (SELECT id FROM clients WHERE "fullName" = 'Patricia Gómez' LIMIT 1),
    'Necesito unos días más',
    NOW() - INTERVAL '30 minutes',
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM chats WHERE "externalId" = '573001234567@c.us'
);

-- Segundo chat
INSERT INTO chats (
    id,
    "externalId",
    "contactPhone",
    "contactName",
    channel,
    status,
    priority,
    "unreadCount",
    "campaignId",
    "whatsappNumberId",
    "assignedAgentId",
    "clientId",
    "lastMessageText",
    "lastMessageAt",
    "createdAt",
    "updatedAt"
)
SELECT 
    gen_random_uuid(),
    '573009876543@c.us',
    '3009876543',
    'Roberto Sánchez',
    'whatsapp',
    'active',
    90,
    2,
    (SELECT id FROM campaigns WHERE name = 'Cobranzas 2025' LIMIT 1),
    (SELECT id FROM whatsapp_numbers LIMIT 1),
    (SELECT id FROM users WHERE email = 'juan@crm.com'),
    (SELECT id FROM clients WHERE "fullName" = 'Roberto Sánchez' LIMIT 1),
    'Hace como 3 meses',
    NOW() - INTERVAL '45 minutes',
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM chats WHERE "externalId" = '573009876543@c.us'
);

-- Verificar
SELECT 
    c.id,
    c."externalId",
    c."contactName",
    c.status,
    c.priority,
    cl."fullName" as cliente,
    u."fullName" as agente
FROM chats c
LEFT JOIN clients cl ON c."clientId" = cl.id
LEFT JOIN users u ON c."assignedAgentId" = u.id
WHERE u.email = 'juan@crm.com'
ORDER BY c.priority DESC;
