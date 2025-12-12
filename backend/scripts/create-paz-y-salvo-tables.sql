-- Migración: Tablas para Sistema de Paz y Salvo
-- Desarrollado por: Alejandro Sandoval - AS Software
-- Fecha: 2025-01-25

-- ============================================
-- TABLA: client_phone_numbers
-- Múltiples números de WhatsApp por cliente
-- ============================================

CREATE TABLE IF NOT EXISTS client_phone_numbers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "clientId" UUID NOT NULL,
  "phoneNumber" VARCHAR(50) NOT NULL,
  "isPrimary" BOOLEAN DEFAULT false,
  "isActive" BOOLEAN DEFAULT true,
  notes TEXT,
  "lastContactAt" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  
  -- Claves foráneas
  CONSTRAINT fk_client_phone_client 
    FOREIGN KEY ("clientId") 
    REFERENCES clients(id) 
    ON DELETE CASCADE,
  
  -- Índices
  CONSTRAINT uk_client_phone 
    UNIQUE ("clientId", "phoneNumber")
);

-- Índice para búsquedas rápidas por teléfono
CREATE INDEX IF NOT EXISTS idx_client_phone_number 
  ON client_phone_numbers("phoneNumber");

-- Índice para búsquedas por cliente
CREATE INDEX IF NOT EXISTS idx_client_phone_client 
  ON client_phone_numbers("clientId");

COMMENT ON TABLE client_phone_numbers IS 'Almacena múltiples números de WhatsApp por cliente para identificación multi-canal';
COMMENT ON COLUMN client_phone_numbers."isPrimary" IS 'Indica si es el número principal de contacto';
COMMENT ON COLUMN client_phone_numbers."isActive" IS 'Indica si el número está activo para contacto';

-- ============================================
-- TABLA: paz_y_salvos
-- Certificados de paz y salvo para clientes pagados
-- ============================================

CREATE TYPE paz_y_salvo_status AS ENUM ('pending', 'available', 'downloaded');

CREATE TABLE IF NOT EXISTS paz_y_salvos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "certificateNumber" VARCHAR(100) NOT NULL UNIQUE,
  "clientId" UUID NOT NULL,
  "paymentDate" DATE NOT NULL,
  "paidAmount" NUMERIC(15, 2) NOT NULL,
  "availableFromDate" DATE NOT NULL,
  status paz_y_salvo_status DEFAULT 'pending',
  "filePath" TEXT,
  "generatedBy" UUID,
  "downloadedBy" UUID,
  "downloadedAt" TIMESTAMP,
  metadata JSONB,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  
  -- Claves foráneas
  CONSTRAINT fk_paz_y_salvo_client 
    FOREIGN KEY ("clientId") 
    REFERENCES clients(id) 
    ON DELETE CASCADE,
  
  CONSTRAINT fk_paz_y_salvo_generated_by 
    FOREIGN KEY ("generatedBy") 
    REFERENCES users(id) 
    ON DELETE SET NULL,
  
  CONSTRAINT fk_paz_y_salvo_downloaded_by 
    FOREIGN KEY ("downloadedBy") 
    REFERENCES users(id) 
    ON DELETE SET NULL
);

-- Índice para búsquedas por cliente
CREATE INDEX IF NOT EXISTS idx_paz_y_salvo_client 
  ON paz_y_salvos("clientId");

-- Índice para búsquedas por estado
CREATE INDEX IF NOT EXISTS idx_paz_y_salvo_status 
  ON paz_y_salvos(status);

-- Índice para búsquedas por fecha de disponibilidad
CREATE INDEX IF NOT EXISTS idx_paz_y_salvo_available_from 
  ON paz_y_salvos("availableFromDate");

COMMENT ON TABLE paz_y_salvos IS 'Certificados de paz y salvo con período de espera de 5 días hábiles';
COMMENT ON COLUMN paz_y_salvos."certificateNumber" IS 'Número único del certificado (formato: PYS-XXXXXXXXXX)';
COMMENT ON COLUMN paz_y_salvos."availableFromDate" IS 'Fecha calculada: paymentDate + 5 días hábiles';
COMMENT ON COLUMN paz_y_salvos.status IS 'pending: esperando 5 días, available: listo para descarga, downloaded: ya descargado';
COMMENT ON COLUMN paz_y_salvos.metadata IS 'Información adicional: deuda original, campaña, agente, etc.';

-- ============================================
-- DATOS INICIALES
-- ============================================

-- Crear registros de teléfono para clientes existentes
INSERT INTO client_phone_numbers ("clientId", "phoneNumber", "isPrimary", "isActive", "lastContactAt")
SELECT 
  id, 
  phone, 
  true, 
  true,
  NOW()
FROM clients
WHERE phone IS NOT NULL
ON CONFLICT ("clientId", "phoneNumber") DO NOTHING;

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger para actualizar updatedAt
CREATE OR REPLACE FUNCTION update_client_phone_numbers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_client_phone_numbers_updated_at
  BEFORE UPDATE ON client_phone_numbers
  FOR EACH ROW
  EXECUTE FUNCTION update_client_phone_numbers_updated_at();

CREATE OR REPLACE FUNCTION update_paz_y_salvos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_paz_y_salvos_updated_at
  BEFORE UPDATE ON paz_y_salvos
  FOR EACH ROW
  EXECUTE FUNCTION update_paz_y_salvos_updated_at();

-- ============================================
-- VERIFICACIÓN
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Tablas creadas exitosamente:';
  RAISE NOTICE '   - client_phone_numbers';
  RAISE NOTICE '   - paz_y_salvos';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Registros iniciales:';
  RAISE NOTICE '   - Teléfonos migrados: %', (SELECT COUNT(*) FROM client_phone_numbers);
  RAISE NOTICE '   - Paz y salvos: %', (SELECT COUNT(*) FROM paz_y_salvos);
END $$;
