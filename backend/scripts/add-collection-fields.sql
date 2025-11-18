-- Agregar campos para gestión de cobranzas
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS "debtAmount" numeric(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS "daysOverdue" integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS "lastPaymentDate" timestamp,
ADD COLUMN IF NOT EXISTS "promisePaymentDate" timestamp,
ADD COLUMN IF NOT EXISTS "promisePaymentAmount" numeric(10,2),
ADD COLUMN IF NOT EXISTS "collectionStatus" varchar(50) DEFAULT 'pending';

-- Crear índice para consultas de cobranza
CREATE INDEX IF NOT EXISTS idx_clients_collection_status ON clients("collectionStatus");
CREATE INDEX IF NOT EXISTS idx_clients_days_overdue ON clients("daysOverdue");

-- Comentarios para documentación
COMMENT ON COLUMN clients."debtAmount" IS 'Monto total de la deuda';
COMMENT ON COLUMN clients."daysOverdue" IS 'Días en mora';
COMMENT ON COLUMN clients."lastPaymentDate" IS 'Fecha del último pago';
COMMENT ON COLUMN clients."promisePaymentDate" IS 'Fecha comprometida de pago';
COMMENT ON COLUMN clients."promisePaymentAmount" IS 'Monto comprometido a pagar';
COMMENT ON COLUMN clients."collectionStatus" IS 'Estado de gestión: pending, contacted, promise, paid, legal, unlocatable';

-- Actualizar clientes existentes con datos de ejemplo
UPDATE clients 
SET 
    "debtAmount" = 1500000.00,
    "daysOverdue" = 45,
    "collectionStatus" = 'contacted'
WHERE phone = '573009876543';

-- Verificar
SELECT "fullName", phone, "debtAmount", "daysOverdue", "collectionStatus", "promisePaymentDate"
FROM clients;
