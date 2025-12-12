-- Script para crear tabla de seguimiento de jornada laboral de agentes
-- Incluye: entrada, salida, pausas (almuerzo, break, etc.)

-- Tabla principal de jornadas
CREATE TABLE IF NOT EXISTS agent_workdays (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    work_date DATE NOT NULL,
    
    -- Horarios de entrada y salida
    clock_in_time TIMESTAMP,
    clock_out_time TIMESTAMP,
    
    -- Tiempo total trabajado (en minutos)
    total_work_minutes INTEGER DEFAULT 0,
    total_pause_minutes INTEGER DEFAULT 0,
    total_productive_minutes INTEGER DEFAULT 0,
    
    -- Estado actual
    current_status VARCHAR(50) DEFAULT 'offline', -- offline, working, on_pause
    
    -- Estadísticas del día
    chats_handled INTEGER DEFAULT 0,
    messages_sent INTEGER DEFAULT 0,
    avg_response_time_seconds INTEGER DEFAULT 0,
    
    -- Metadata
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(agent_id, work_date)
);

-- Tabla de pausas detalladas
CREATE TABLE IF NOT EXISTS agent_pauses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workday_id UUID NOT NULL REFERENCES agent_workdays(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Tipo de pausa
    pause_type VARCHAR(50) NOT NULL, -- lunch, break, bathroom, meeting, other
    
    -- Tiempos
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    duration_minutes INTEGER,
    
    -- Información adicional
    reason TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de eventos de jornada (log completo)
CREATE TABLE IF NOT EXISTS agent_workday_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workday_id UUID REFERENCES agent_workdays(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    event_type VARCHAR(50) NOT NULL, -- clock_in, clock_out, pause_start, pause_end, status_change
    event_data JSONB,
    event_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_workdays_agent_date ON agent_workdays(agent_id, work_date);
CREATE INDEX IF NOT EXISTS idx_workdays_date ON agent_workdays(work_date);
CREATE INDEX IF NOT EXISTS idx_workdays_status ON agent_workdays(current_status);

CREATE INDEX IF NOT EXISTS idx_pauses_workday ON agent_pauses(workday_id);
CREATE INDEX IF NOT EXISTS idx_pauses_agent ON agent_pauses(agent_id);
CREATE INDEX IF NOT EXISTS idx_pauses_type ON agent_pauses(pause_type);

CREATE INDEX IF NOT EXISTS idx_events_workday ON agent_workday_events(workday_id);
CREATE INDEX IF NOT EXISTS idx_events_agent ON agent_workday_events(agent_id);
CREATE INDEX IF NOT EXISTS idx_events_time ON agent_workday_events(event_time);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_workday_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_workdays_updated_at
    BEFORE UPDATE ON agent_workdays
    FOR EACH ROW
    EXECUTE FUNCTION update_workday_updated_at();

CREATE TRIGGER trigger_pauses_updated_at
    BEFORE UPDATE ON agent_pauses
    FOR EACH ROW
    EXECUTE FUNCTION update_workday_updated_at();

-- Comentarios
COMMENT ON TABLE agent_workdays IS 'Registro de jornadas laborales de agentes';
COMMENT ON TABLE agent_pauses IS 'Registro detallado de pausas durante la jornada';
COMMENT ON TABLE agent_workday_events IS 'Log completo de eventos de jornada laboral';

COMMENT ON COLUMN agent_workdays.current_status IS 'Estado actual: offline, working, on_pause';
COMMENT ON COLUMN agent_pauses.pause_type IS 'Tipo de pausa: lunch, break, bathroom, meeting, other';
COMMENT ON COLUMN agent_workday_events.event_type IS 'Tipo de evento: clock_in, clock_out, pause_start, pause_end, status_change';
