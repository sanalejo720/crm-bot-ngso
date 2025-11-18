-- Crear clientes deudores para testing de cobranzas
INSERT INTO clients (
    id, "fullName", phone, email, company, position, 
    status, "leadStatus", "debtAmount", "daysOverdue", "collectionStatus",
    "interactionCount", "createdAt", "updatedAt"
) VALUES
-- Cliente 1: Mora alta
(gen_random_uuid(), 'Roberto Sánchez', '573005551111', 'roberto@test.com', 'Independiente', 'Comerciante',
 'customer', 'contacted', 3500000, 90, 'contacted', 2, NOW(), NOW()),

-- Cliente 2: Mora media
(gen_random_uuid(), 'Ana Martínez', '573005552222', 'ana.martinez@test.com', 'Servicios SA', 'Gerente',
 'customer', 'new', 1200000, 30, 'pending', 0, NOW(), NOW()),

-- Cliente 3: Mora baja
(gen_random_uuid(), 'Luis Fernández', '573005553333', 'luis.f@test.com', NULL, NULL,
 'customer', 'contacted', 800000, 15, 'promise', 1, NOW(), NOW()),

-- Cliente 4: Alto riesgo
(gen_random_uuid(), 'Patricia Gómez', '573005554444', 'patricia@test.com', 'Construcciones ABC', 'Contadora',
 'customer', 'negotiation', 5000000, 120, 'legal', 5, NOW(), NOW()),

-- Cliente 5: Recién vencido
(gen_random_uuid(), 'Carlos Torres', '573005555555', 'ctorres@test.com', 'Tech Solutions', 'CEO',
 'customer', 'new', 2100000, 5, 'pending', 0, NOW(), NOW())
ON CONFLICT (phone) DO NOTHING;

-- Actualizar promesas de pago para algunos
UPDATE clients 
SET "promisePaymentDate" = NOW() + INTERVAL '7 days',
    "promisePaymentAmount" = 400000
WHERE phone = '573005553333';

UPDATE clients 
SET "lastPaymentDate" = NOW() - INTERVAL '45 days'
WHERE phone = '573005551111';

-- Ver resumen de cartera
SELECT 
    "fullName" as cliente,
    phone as telefono,
    "debtAmount" as deuda,
    "daysOverdue" as dias_mora,
    "collectionStatus" as estado,
    "promisePaymentDate" as promesa_pago
FROM clients
WHERE "debtAmount" > 0
ORDER BY "daysOverdue" DESC;

-- Estadísticas de cartera
SELECT 
    "collectionStatus" as estado,
    COUNT(*) as cantidad,
    SUM("debtAmount") as monto_total,
    AVG("daysOverdue")::integer as promedio_dias_mora
FROM clients
WHERE "debtAmount" > 0
GROUP BY "collectionStatus"
ORDER BY monto_total DESC;
