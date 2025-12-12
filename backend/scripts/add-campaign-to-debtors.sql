-- Agregar columna campaignId a debtors
ALTER TABLE debtors
ADD COLUMN IF NOT EXISTS "campaignId" UUID REFERENCES campaigns(id) ON DELETE SET NULL;

-- Crear índice para mejorar performance
CREATE INDEX IF NOT EXISTS "IDX_debtors_campaignId" ON debtors("campaignId");

-- Verificar
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'debtors' AND column_name = 'campaignId';
