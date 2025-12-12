-- ============================================================================
-- MIGRACIÓN SQL COMPLETA - Sistema de Estados del CRM WhatsApp
-- ============================================================================
-- Descripción: Agrega máquina de estados completa con 11 estados principales,
--              12 sub-estados, tablas de auditoría y métricas
-- Versión: 1.0
-- Fecha: Diciembre 2024
-- Base de datos: crm_whatsapp
-- ============================================================================

-- ============================================================================
-- PASO 1: Agregar nuevos campos a la tabla chats
-- ============================================================================

ALTER TABLE chats ADD COLUMN IF NOT EXISTS sub_status VARCHAR(50);
COMMENT ON COLUMN chats.sub_status IS 'Sub-estado granular del chat para tracking detallado';

ALTER TABLE chats ADD COLUMN IF NOT EXISTS is_bot_active BOOLEAN DEFAULT false;
COMMENT ON COLUMN chats.is_bot_active IS 'Indica si el bot está actualmente manejando el chat';

ALTER TABLE chats ADD COLUMN IF NOT EXISTS last_agent_message_at TIMESTAMP;
COMMENT ON COLUMN chats.last_agent_message_at IS 'Timestamp del último mensaje enviado por el agente';

ALTER TABLE chats ADD COLUMN IF NOT EXISTS last_client_message_at TIMESTAMP;
COMMENT ON COLUMN chats.last_client_message_at IS 'Timestamp del último mensaje recibido del cliente';

ALTER TABLE chats ADD COLUMN IF NOT EXISTS first_response_time_seconds INTEGER;
COMMENT ON COLUMN chats.first_response_time_seconds IS 'Tiempo en segundos desde creación hasta primera respuesta del agente (SLA)';

ALTER TABLE chats ADD COLUMN IF NOT EXISTS agent_warning_sent BOOLEAN DEFAULT false;
COMMENT ON COLUMN chats.agent_warning_sent IS 'Flag para indicar si ya se envió advertencia de timeout al agente';

ALTER TABLE chats ADD COLUMN IF NOT EXISTS client_warning_sent BOOLEAN DEFAULT false;
COMMENT ON COLUMN chats.client_warning_sent IS 'Flag para indicar si ya se envió advertencia de timeout al cliente';

ALTER TABLE chats ADD COLUMN IF NOT EXISTS auto_close_scheduled_at TIMESTAMP;
COMMENT ON COLUMN chats.auto_close_scheduled_at IS 'Timestamp en que se programó el cierre automático del chat';

ALTER TABLE chats ADD COLUMN IF NOT EXISTS transfer_count INTEGER DEFAULT 0;
COMMENT ON COLUMN chats.transfer_count IS 'Contador de cuántas veces se ha transferido este chat entre agentes';

ALTER TABLE chats ADD COLUMN IF NOT EXISTS bot_restart_count INTEGER DEFAULT 0;
COMMENT ON COLUMN chats.bot_restart_count IS 'Contador de cuántas veces el chat ha sido retornado al bot';

-- ============================================================================
-- PASO 2: Crear tabla de transiciones de estado (Auditoría)
-- ============================================================================

CREATE TABLE IF NOT EXISTS chat_state_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  from_status VARCHAR(50) NOT NULL,
  to_status VARCHAR(50) NOT NULL,
  from_sub_status VARCHAR(50),
  to_sub_status VARCHAR(50),
  reason TEXT,
  triggered_by VARCHAR(50) NOT NULL, -- 'system', 'agent', 'supervisor', 'bot', 'client'
  agent_id UUID REFERENCES users(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_triggered_by CHECK (triggered_by IN ('system', 'agent', 'supervisor', 'bot', 'client'))
);

COMMENT ON TABLE chat_state_transitions IS 'Tabla de auditoría que registra todas las transiciones de estado de los chats';
COMMENT ON COLUMN chat_state_transitions.from_status IS 'Estado anterior del chat';
COMMENT ON COLUMN chat_state_transitions.to_status IS 'Nuevo estado del chat';
COMMENT ON COLUMN chat_state_transitions.reason IS 'Motivo de la transición';
COMMENT ON COLUMN chat_state_transitions.triggered_by IS 'Quién o qué disparó la transición';
COMMENT ON COLUMN chat_state_transitions.agent_id IS 'ID del agente que ejecutó la acción (si aplica)';
COMMENT ON COLUMN chat_state_transitions.metadata IS 'Datos adicionales en formato JSON (flexible)';

-- ============================================================================
-- PASO 3: Crear tabla de métricas de respuesta (KPIs)
-- ============================================================================

CREATE TABLE IF NOT EXISTS chat_response_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES users(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  
  -- Métricas de tiempo
  first_response_seconds INTEGER,
  avg_agent_response_seconds INTEGER,
  avg_client_response_seconds INTEGER,
  total_agent_messages INTEGER DEFAULT 0,
  total_client_messages INTEGER DEFAULT 0,
  
  -- Métricas de resultado
  chat_duration_minutes INTEGER,
  was_transferred BOOLEAN DEFAULT false,
  transfer_count INTEGER DEFAULT 0,
  returned_to_bot BOOLEAN DEFAULT false,
  closed_by VARCHAR(50), -- 'agent', 'client', 'system', 'timeout'
  resolution_status VARCHAR(50),
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_closed_by CHECK (closed_by IN ('agent', 'client', 'system', 'timeout', 'auto_close'))
);

COMMENT ON TABLE chat_response_metrics IS 'Métricas de rendimiento y KPIs por chat para análisis posterior';
COMMENT ON COLUMN chat_response_metrics.first_response_seconds IS 'Tiempo de primera respuesta del agente (SLA crítico)';
COMMENT ON COLUMN chat_response_metrics.avg_agent_response_seconds IS 'Tiempo promedio de respuesta del agente';
COMMENT ON COLUMN chat_response_metrics.avg_client_response_seconds IS 'Tiempo promedio de respuesta del cliente';
COMMENT ON COLUMN chat_response_metrics.chat_duration_minutes IS 'Duración total del chat en minutos';
COMMENT ON COLUMN chat_response_metrics.closed_by IS 'Quién cerró el chat';

-- ============================================================================
-- PASO 4: Crear índices para optimización de queries
-- ============================================================================

-- Índice compuesto para búsquedas por estado y última actualización
CREATE INDEX IF NOT EXISTS idx_chats_status_updated 
ON chats(status, updated_at DESC);

COMMENT ON INDEX idx_chats_status_updated IS 'Optimiza queries de chats por estado ordenados por última actualización';

-- Índice para monitoreo de timeouts de agente
CREATE INDEX IF NOT EXISTS idx_chats_last_agent_msg 
ON chats(last_agent_message_at) 
WHERE status IN ('agent_assigned', 'agent_responding', 'agent_waiting_client');

COMMENT ON INDEX idx_chats_last_agent_msg IS 'Optimiza búsqueda de chats con posible timeout de agente';

-- Índice para monitoreo de timeouts de cliente
CREATE INDEX IF NOT EXISTS idx_chats_last_client_msg 
ON chats(last_client_message_at) 
WHERE status = 'agent_waiting_client';

COMMENT ON INDEX idx_chats_last_client_msg IS 'Optimiza búsqueda de chats con posible timeout de cliente';

-- Índice para auto-cierre por tiempo (24 horas)
CREATE INDEX IF NOT EXISTS idx_chats_auto_close 
ON chats(created_at, status) 
WHERE status NOT IN ('closed', 'system_timeout');

COMMENT ON INDEX idx_chats_auto_close IS 'Optimiza búsqueda de chats mayores a 24 horas para auto-cierre';

-- Índice para tabla de transiciones (búsqueda por chat)
CREATE INDEX IF NOT EXISTS idx_transitions_chat_id 
ON chat_state_transitions(chat_id, created_at DESC);

COMMENT ON INDEX idx_transitions_chat_id IS 'Optimiza búsqueda de historial de transiciones por chat';

-- Índice para tabla de transiciones (búsqueda por agente)
CREATE INDEX IF NOT EXISTS idx_transitions_agent_id 
ON chat_state_transitions(agent_id, created_at DESC);

COMMENT ON INDEX idx_transitions_agent_id IS 'Optimiza búsqueda de transiciones ejecutadas por agente';

-- Índice para métricas (búsqueda por agente)
CREATE INDEX IF NOT EXISTS idx_metrics_agent_id 
ON chat_response_metrics(agent_id, created_at DESC);

COMMENT ON INDEX idx_metrics_agent_id IS 'Optimiza queries de métricas por agente';

-- Índice para métricas (búsqueda por campaña)
CREATE INDEX IF NOT EXISTS idx_metrics_campaign_id 
ON chat_response_metrics(campaign_id, created_at DESC);

COMMENT ON INDEX idx_metrics_campaign_id IS 'Optimiza queries de métricas por campaña';

-- ============================================================================
-- PASO 5: Migrar datos existentes (valores por defecto)
-- ============================================================================

-- Actualizar chats existentes con valores por defecto
UPDATE chats 
SET 
  is_bot_active = CASE 
    WHEN status = 'active' AND assigned_agent_id IS NULL THEN true 
    ELSE false 
  END,
  last_agent_message_at = updated_at, -- Asumir última actualización como último mensaje
  last_client_message_at = updated_at,
  transfer_count = 0,
  bot_restart_count = 0,
  agent_warning_sent = false,
  client_warning_sent = false
WHERE 
  is_bot_active IS NULL;

-- Mensaje de confirmación
DO $$
DECLARE
  affected_rows INTEGER;
BEGIN
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RAISE NOTICE 'Chats actualizados con valores por defecto: %', affected_rows;
END $$;

-- ============================================================================
-- PASO 6: Crear función para actualizar updated_at en métricas
-- ============================================================================

CREATE OR REPLACE FUNCTION update_metrics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_metrics_updated_at IS 'Trigger function para actualizar automáticamente el campo updated_at';

-- Crear trigger
DROP TRIGGER IF EXISTS trigger_update_metrics_timestamp ON chat_response_metrics;
CREATE TRIGGER trigger_update_metrics_timestamp
BEFORE UPDATE ON chat_response_metrics
FOR EACH ROW
EXECUTE FUNCTION update_metrics_updated_at();

-- ============================================================================
-- PASO 7: Crear vistas útiles para dashboards
-- ============================================================================

-- Vista: Chats en cola de espera (para supervisores)
CREATE OR REPLACE VIEW v_waiting_queue AS
SELECT 
  c.id,
  c.contact_name,
  c.contact_phone,
  c.status,
  c.sub_status,
  c.created_at,
  EXTRACT(EPOCH FROM (NOW() - c.created_at))/60 AS minutes_waiting,
  camp.name AS campaign_name,
  CASE 
    WHEN d.amount_owed > 10000 AND d.days_overdue > 60 THEN 'high'
    WHEN d.amount_owed > 5000 OR d.days_overdue > 30 THEN 'medium'
    ELSE 'low'
  END AS priority
FROM chats c
LEFT JOIN campaigns camp ON c.campaign_id = camp.id
LEFT JOIN debtors d ON c.debtor_id = d.id
WHERE c.status = 'bot_waiting_queue'
ORDER BY 
  CASE 
    WHEN d.amount_owed > 10000 AND d.days_overdue > 60 THEN 1
    WHEN d.amount_owed > 5000 OR d.days_overdue > 30 THEN 2
    ELSE 3
  END,
  c.created_at ASC;

COMMENT ON VIEW v_waiting_queue IS 'Vista optimizada de chats en cola de espera ordenados por prioridad';

-- Vista: Chats próximos a auto-cerrar (24h)
CREATE OR REPLACE VIEW v_upcoming_auto_close AS
SELECT 
  c.id,
  c.contact_name,
  c.contact_phone,
  c.status,
  c.assigned_agent_id,
  u.full_name AS agent_name,
  c.created_at,
  EXTRACT(EPOCH FROM (c.created_at + INTERVAL '24 hours' - NOW()))/3600 AS hours_until_close,
  EXTRACT(EPOCH FROM (NOW() - c.created_at))/3600 AS hours_active
FROM chats c
LEFT JOIN users u ON c.assigned_agent_id = u.id
WHERE 
  c.status NOT IN ('closed', 'system_timeout')
  AND c.created_at < NOW() - INTERVAL '22 hours' -- 2 horas antes del cierre
ORDER BY c.created_at ASC;

COMMENT ON VIEW v_upcoming_auto_close IS 'Vista de chats que se cerrarán automáticamente en las próximas 2 horas';

-- Vista: Estadísticas de timeouts por agente
CREATE OR REPLACE VIEW v_agent_timeout_stats AS
SELECT 
  u.id AS agent_id,
  u.full_name AS agent_name,
  COUNT(*) FILTER (WHERE cst.to_status = 'closed' AND cst.metadata->>'timeoutType' = 'agent') AS agent_timeouts,
  COUNT(*) FILTER (WHERE cst.to_status = 'client_inactive') AS client_timeouts,
  COUNT(*) FILTER (WHERE cst.from_status = 'transferring') AS transfers_received,
  COUNT(*) FILTER (WHERE cst.to_status = 'bot_initial' AND cst.from_status != 'closed') AS returns_to_bot
FROM users u
LEFT JOIN chat_state_transitions cst ON u.id = cst.agent_id
WHERE u.role = 'agent'
  AND cst.created_at >= NOW() - INTERVAL '30 days'
GROUP BY u.id, u.full_name
ORDER BY agent_timeouts DESC;

COMMENT ON VIEW v_agent_timeout_stats IS 'Estadísticas de timeouts y acciones por agente (últimos 30 días)';

-- ============================================================================
-- PASO 8: Verificación de integridad
-- ============================================================================

DO $$
DECLARE
  chats_count INTEGER;
  transitions_table_exists BOOLEAN;
  metrics_table_exists BOOLEAN;
  indexes_count INTEGER;
BEGIN
  -- Contar chats
  SELECT COUNT(*) INTO chats_count FROM chats;
  
  -- Verificar tablas
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'chat_state_transitions'
  ) INTO transitions_table_exists;
  
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'chat_response_metrics'
  ) INTO metrics_table_exists;
  
  -- Contar índices creados
  SELECT COUNT(*) INTO indexes_count 
  FROM pg_indexes 
  WHERE indexname LIKE 'idx_chats_%' OR indexname LIKE 'idx_transitions_%' OR indexname LIKE 'idx_metrics_%';
  
  -- Reporte
  RAISE NOTICE '========================================';
  RAISE NOTICE 'VERIFICACIÓN DE MIGRACIÓN COMPLETADA';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total de chats en BD: %', chats_count;
  RAISE NOTICE 'Tabla chat_state_transitions: %', CASE WHEN transitions_table_exists THEN '✓ CREADA' ELSE '✗ ERROR' END;
  RAISE NOTICE 'Tabla chat_response_metrics: %', CASE WHEN metrics_table_exists THEN '✓ CREADA' ELSE '✗ ERROR' END;
  RAISE NOTICE 'Índices creados: %', indexes_count;
  RAISE NOTICE '========================================';
  
  IF NOT transitions_table_exists OR NOT metrics_table_exists THEN
    RAISE EXCEPTION 'Error: No se pudieron crear todas las tablas';
  END IF;
  
END $$;

-- ============================================================================
-- PASO 9: Grants de permisos (ajustar según tu configuración)
-- ============================================================================

-- Permisos para el usuario de la aplicación (ajustar "crm_admin" si es diferente)
GRANT SELECT, INSERT, UPDATE, DELETE ON chat_state_transitions TO crm_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON chat_response_metrics TO crm_admin;
GRANT SELECT ON v_waiting_queue TO crm_admin;
GRANT SELECT ON v_upcoming_auto_close TO crm_admin;
GRANT SELECT ON v_agent_timeout_stats TO crm_admin;

-- ============================================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================================

-- Mensaje final
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✓ MIGRACIÓN COMPLETADA EXITOSAMENTE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Próximos pasos:';
  RAISE NOTICE '1. Actualizar Chat entity en TypeORM';
  RAISE NOTICE '2. Crear ChatStateTransition entity';
  RAISE NOTICE '3. Crear ChatResponseMetrics entity';
  RAISE NOTICE '4. Implementar ChatStateService';
  RAISE NOTICE '5. Implementar Workers (Timeout + AutoClose)';
  RAISE NOTICE '========================================';
END $$;
