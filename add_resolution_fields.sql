-- Migración: Agregar campos de resolución a chats y clients
-- Fecha: 2025-01-18
-- Autor: Sistema CRM NGS&O

-- 1. Agregar campos de resolución a la tabla chats
ALTER TABLE chats 
ADD COLUMN IF NOT EXISTS resolution_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS resolution_notes TEXT,
ADD COLUMN IF NOT EXISTS resolution_metadata JSONB;

-- 2. Agregar campos a la tabla clients
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50),
ADD COLUMN IF NOT EXISTS payment_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS promise_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS last_contact_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS callback_date TIMESTAMP;

-- 3. Crear índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_chats_resolution_type ON chats(resolution_type);
CREATE INDEX IF NOT EXISTS idx_chats_resolved_at ON chats(resolved_at);
CREATE INDEX IF NOT EXISTS idx_clients_collection_status ON clients(collection_status);
CREATE INDEX IF NOT EXISTS idx_clients_promise_date ON clients(promise_date);
CREATE INDEX IF NOT EXISTS idx_clients_callback_date ON clients(callback_date);

-- 4. Verificar existencia de tabla payment_records
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_records') THEN
        CREATE TABLE payment_records (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            client_id UUID REFERENCES clients(id),
            agent_id UUID,
            campaign_id UUID,
            amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
            original_debt DECIMAL(15, 2),
            remaining_debt DECIMAL(15, 2),
            recovery_percentage DECIMAL(5, 2),
            payment_date TIMESTAMP DEFAULT NOW(),
            source VARCHAR(50) DEFAULT 'manual',
            status VARCHAR(50) DEFAULT 'confirmed',
            reference_id VARCHAR(100),
            notes TEXT,
            metadata JSONB,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );
        
        CREATE INDEX idx_payment_records_payment_date ON payment_records(payment_date);
        CREATE INDEX idx_payment_records_agent_id ON payment_records(agent_id);
        CREATE INDEX idx_payment_records_campaign_id ON payment_records(campaign_id);
        CREATE INDEX idx_payment_records_client_id ON payment_records(client_id);
        CREATE INDEX idx_payment_records_status ON payment_records(status);
        
        ALTER TABLE payment_records OWNER TO crm_admin;
    END IF;
END $$;

-- Mensaje de confirmación
SELECT 'Migración de campos de resolución completada exitosamente' AS status;
