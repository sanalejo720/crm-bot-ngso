-- Agregar campos de cobranzas a la tabla clients

-- Agregar columnas de deuda
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS "debtAmount" NUMERIC(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS "originalDebtAmount" NUMERIC(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS "daysOverdue" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "dueDate" TIMESTAMP,
ADD COLUMN IF NOT EXISTS "lastPaymentAmount" NUMERIC(15,2),
ADD COLUMN IF NOT EXISTS "lastPaymentDate" TIMESTAMP,
ADD COLUMN IF NOT EXISTS "promisePaymentDate" TIMESTAMP,
ADD COLUMN IF NOT EXISTS "promisePaymentAmount" NUMERIC(15,2),
ADD COLUMN IF NOT EXISTS "collectionStatus" VARCHAR(50) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS "priority" VARCHAR(20),
ADD COLUMN IF NOT EXISTS "documentNumber" VARCHAR(50),
ADD COLUMN IF NOT EXISTS "address" TEXT,
ADD COLUMN IF NOT EXISTS "city" VARCHAR(100),
ADD COLUMN IF NOT EXISTS "country" VARCHAR(100) DEFAULT 'Colombia';

-- Actualizar los clientes existentes con datos de cobranza
UPDATE clients SET 
  "debtAmount" = 5000000,
  "originalDebtAmount" = 5000000,
  "daysOverdue" = 120,
  "dueDate" = NOW() - INTERVAL '120 days',
  "collectionStatus" = 'contacted',
  "priority" = 'URGENTE',
  "documentNumber" = '1234567890'
WHERE "fullName" = 'Patricia Gómez';

UPDATE clients SET 
  "debtAmount" = 3500000,
  "originalDebtAmount" = 3500000,
  "daysOverdue" = 90,
  "dueDate" = NOW() - INTERVAL '90 days',
  "collectionStatus" = 'promise',
  "priority" = 'ALTA',
  "documentNumber" = '9876543210',
  "promisePaymentDate" = NOW() + INTERVAL '7 days',
  "promisePaymentAmount" = 1000000
WHERE "fullName" = 'Roberto Sánchez';

UPDATE clients SET 
  "debtAmount" = 1500000,
  "originalDebtAmount" = 1500000,
  "daysOverdue" = 45,
  "dueDate" = NOW() - INTERVAL '45 days',
  "collectionStatus" = 'contacted',
  "priority" = 'MEDIA',
  "documentNumber" = '1122334455'
WHERE "fullName" = 'María González';

UPDATE clients SET 
  "debtAmount" = 2200000,
  "originalDebtAmount" = 2200000,
  "daysOverdue" = 60,
  "dueDate" = NOW() - INTERVAL '60 days',
  "collectionStatus" = 'pending',
  "priority" = 'ALTA',
  "documentNumber" = '5544332211'
WHERE "fullName" = 'Carlos Rodríguez';

UPDATE clients SET 
  "debtAmount" = 800000,
  "originalDebtAmount" = 800000,
  "daysOverdue" = 15,
  "dueDate" = NOW() - INTERVAL '15 days',
  "collectionStatus" = 'pending',
  "priority" = 'BAJA',
  "documentNumber" = '9988776655'
WHERE "fullName" = 'Ana Martínez';

UPDATE clients SET 
  "debtAmount" = 4100000,
  "originalDebtAmount" = 4100000,
  "daysOverdue" = 105,
  "dueDate" = NOW() - INTERVAL '105 days',
  "collectionStatus" = 'legal',
  "priority" = 'URGENTE',
  "documentNumber" = '6677889900'
WHERE "fullName" = 'Luis Fernández';

-- Verificar resultados
SELECT 
  "fullName",
  "debtAmount",
  "daysOverdue",
  "collectionStatus",
  "priority",
  "documentNumber"
FROM clients
WHERE "debtAmount" > 0
ORDER BY "daysOverdue" DESC;
