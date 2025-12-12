-- Migración: Crear tabla agent_sessions para historial de asistencia
-- Fecha: 2025-12-10
-- Propósito: Trackear sesiones de login/logout de agentes para control de asistencia

-- Crear tabla agent_sessions
CREATE TABLE IF NOT EXISTS agent_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "userId" UUID NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('available', 'busy', 'break', 'offline')),
  reason TEXT,
  "startedAt" TIMESTAMP NOT NULL,
  "endedAt" TIMESTAMP,
  "durationSeconds" INTEGER,
  "ipAddress" VARCHAR(45),
  "userAgent" TEXT,
  "campaignId" UUID,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT "FK_agent_sessions_user" FOREIGN KEY ("userId") 
    REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT "FK_agent_sessions_campaign" FOREIGN KEY ("campaignId") 
    REFERENCES campaigns(id) ON DELETE SET NULL
);

-- Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS "IDX_agent_sessions_userId" ON agent_sessions("userId");
CREATE INDEX IF NOT EXISTS "IDX_agent_sessions_status" ON agent_sessions(status);
CREATE INDEX IF NOT EXISTS "IDX_agent_sessions_startedAt" ON agent_sessions("startedAt");
CREATE INDEX IF NOT EXISTS "IDX_agent_sessions_campaignId" ON agent_sessions("campaignId");

-- Comentarios para documentación
COMMENT ON TABLE agent_sessions IS 'Historial de sesiones de agentes para control de asistencia y tracking de estados';
COMMENT ON COLUMN agent_sessions."userId" IS 'ID del agente';
COMMENT ON COLUMN agent_sessions.status IS 'Estado del agente durante la sesión';
COMMENT ON COLUMN agent_sessions.reason IS 'Motivo del estado (especialmente para breaks)';
COMMENT ON COLUMN agent_sessions."startedAt" IS 'Fecha y hora de inicio de sesión';
COMMENT ON COLUMN agent_sessions."endedAt" IS 'Fecha y hora de fin de sesión';
COMMENT ON COLUMN agent_sessions."durationSeconds" IS 'Duración total de la sesión en segundos';
COMMENT ON COLUMN agent_sessions."ipAddress" IS 'Dirección IP desde donde se conectó';
COMMENT ON COLUMN agent_sessions."userAgent" IS 'User agent del navegador utilizado';

-- Verificar creación exitosa
SELECT 'Tabla agent_sessions creada exitosamente' AS resultado;
