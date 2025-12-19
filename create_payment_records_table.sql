-- Crear tabla de registros de pagos para métricas de recaudo
CREATE TABLE IF NOT EXISTS payment_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "clientId" UUID NOT NULL REFERENCES clients(id),
    "agentId" UUID REFERENCES users(id),
    "campaignId" UUID REFERENCES campaigns(id),
    amount DECIMAL(15,2) NOT NULL,
    "originalDebt" DECIMAL(15,2) NOT NULL,
    "remainingDebt" DECIMAL(15,2) NOT NULL,
    "recoveryPercentage" DECIMAL(5,2) NOT NULL,
    "paymentDate" DATE NOT NULL,
    source VARCHAR(20) DEFAULT 'manual',
    status VARCHAR(20) DEFAULT 'confirmed',
    "referenceId" UUID,
    notes TEXT,
    metadata JSONB,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_payment_records_date ON payment_records("paymentDate");
CREATE INDEX IF NOT EXISTS idx_payment_records_agent_date ON payment_records("agentId", "paymentDate");
CREATE INDEX IF NOT EXISTS idx_payment_records_campaign_date ON payment_records("campaignId", "paymentDate");
CREATE INDEX IF NOT EXISTS idx_payment_records_client ON payment_records("clientId");
CREATE INDEX IF NOT EXISTS idx_payment_records_status ON payment_records(status);

-- Verificar que los clientes tengan el campo originalDebtAmount
ALTER TABLE clients ADD COLUMN IF NOT EXISTS "originalDebtAmount" DECIMAL(15,2);

-- Actualizar originalDebtAmount con debtAmount si está vacío
UPDATE clients SET "originalDebtAmount" = "debtAmount" WHERE "originalDebtAmount" IS NULL AND "debtAmount" IS NOT NULL;
