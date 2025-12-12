-- Tabla para registrar operaciones diarias
CREATE TABLE IF NOT EXISTS daily_operations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    operation_type VARCHAR(20) NOT NULL CHECK (operation_type IN ('opening', 'closing', 'backup')),
    operation_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    stats JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_daily_operations_date ON daily_operations(operation_date);
CREATE INDEX IF NOT EXISTS idx_daily_operations_type ON daily_operations(operation_type);

-- Comentarios
COMMENT ON TABLE daily_operations IS 'Registro de operaciones diarias (apertura, cierre, backups)';
COMMENT ON COLUMN daily_operations.operation_type IS 'Tipo: opening (apertura 8AM), closing (cierre 6PM), backup (respaldo 11PM)';
COMMENT ON COLUMN daily_operations.stats IS 'Estadísticas en formato JSON';

-- Vista para reportes rápidos
CREATE OR REPLACE VIEW v_daily_summary AS
SELECT 
    operation_date,
    MAX(CASE WHEN operation_type = 'opening' THEN operation_time END) as hora_apertura,
    MAX(CASE WHEN operation_type = 'closing' THEN operation_time END) as hora_cierre,
    MAX(CASE WHEN operation_type = 'backup' THEN operation_time END) as hora_backup,
    MAX(CASE WHEN operation_type = 'closing' THEN stats END) as estadisticas_dia
FROM daily_operations
GROUP BY operation_date
ORDER BY operation_date DESC;

COMMENT ON VIEW v_daily_summary IS 'Resumen consolidado de operaciones por día';
