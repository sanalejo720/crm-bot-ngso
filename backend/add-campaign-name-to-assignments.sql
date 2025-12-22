-- Agregar columna campaign_name a pending_agent_assignments
ALTER TABLE pending_agent_assignments 
ADD COLUMN IF NOT EXISTS campaign_name VARCHAR(255);

-- Crear índice para búsquedas rápidas por campaña
CREATE INDEX IF NOT EXISTS idx_pending_assignments_campaign_name 
ON pending_agent_assignments(campaign_name);

-- Comentarios
COMMENT ON COLUMN pending_agent_assignments.campaign_name IS 'Nombre de la campaña masiva para filtrar estadísticas';
