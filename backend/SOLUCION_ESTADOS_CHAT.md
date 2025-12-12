# SOLUCIÓN 1: Rediseño Completo de Estados del Chat

## 🔄 Nueva Máquina de Estados

```typescript
export enum ChatStatus {
  // Estados del Bot
  BOT_INITIAL = 'bot_initial',              // Cliente inicia conversación
  BOT_VALIDATING = 'bot_validating',        // Bot validando documento
  BOT_WAITING_QUEUE = 'bot_waiting_queue',  // Esperando asignación a agente
  
  // Estados de Agente
  AGENT_ASSIGNED = 'agent_assigned',        // Chat asignado a agente
  AGENT_RESPONDING = 'agent_responding',    // Agente respondió al menos 1 vez
  AGENT_WAITING_CLIENT = 'agent_waiting_client', // Esperando respuesta del cliente
  
  // Estados de Transferencia
  TRANSFERRING = 'transferring',            // En proceso de transferencia
  
  // Estados de Cierre
  CLOSING = 'closing',                      // Cerrando chat (generando PDF)
  CLOSED = 'closed',                        // Chat cerrado completamente
  
  // Estados de Sistema
  SYSTEM_TIMEOUT = 'system_timeout',        // Cerrado por timeout
  CLIENT_INACTIVE = 'client_inactive',      // Cliente inactivo
}

export enum ChatSubStatus {
  // Sub-estados del Bot
  AWAITING_DOCUMENT = 'awaiting_document',
  DOCUMENT_VALIDATED = 'document_validated',
  AWAITING_AGENT = 'awaiting_agent',
  
  // Sub-estados de Agente
  FIRST_RESPONSE_PENDING = 'first_response_pending',
  IN_CONVERSATION = 'in_conversation',
  NEGOTIATING = 'negotiating',
  
  // Sub-estados de Cierre
  CLIENT_DECLINED = 'client_declined',
  NO_AGREEMENT = 'no_agreement',
  COMPLETED = 'completed',
  TIMEOUT_CLIENT = 'timeout_client',
  TIMEOUT_AGENT = 'timeout_agent',
  AUTO_CLOSED_24H = 'auto_closed_24h',
}
```

## 📝 Migración de Base de Datos

```sql
-- 1. Agregar nuevos campos a la tabla chats
ALTER TABLE chats 
ADD COLUMN sub_status VARCHAR(50),
ADD COLUMN is_bot_active BOOLEAN DEFAULT false,
ADD COLUMN last_agent_message_at TIMESTAMP,
ADD COLUMN last_client_message_at TIMESTAMP,
ADD COLUMN first_response_time INTERVAL,
ADD COLUMN agent_warning_sent BOOLEAN DEFAULT false,
ADD COLUMN client_warning_sent BOOLEAN DEFAULT false,
ADD COLUMN auto_close_scheduled_at TIMESTAMP,
ADD COLUMN transfer_count INTEGER DEFAULT 0,
ADD COLUMN bot_restart_count INTEGER DEFAULT 0;

-- 2. Crear índices para optimizar queries de workers
CREATE INDEX idx_chats_status_updated ON chats(status, updated_at);
CREATE INDEX idx_chats_last_agent_msg ON chats(last_agent_message_at) WHERE status = 'agent_assigned';
CREATE INDEX idx_chats_last_client_msg ON chats(last_client_message_at) WHERE status = 'agent_waiting_client';
CREATE INDEX idx_chats_auto_close ON chats(auto_close_scheduled_at) WHERE status != 'closed';

-- 3. Crear tabla de auditoría de cambios de estado
CREATE TABLE chat_state_transitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  from_status VARCHAR(50),
  to_status VARCHAR(50) NOT NULL,
  from_sub_status VARCHAR(50),
  to_sub_status VARCHAR(50),
  reason VARCHAR(255),
  triggered_by VARCHAR(50), -- 'bot', 'agent', 'system', 'supervisor'
  agent_id UUID REFERENCES users(id),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transitions_chat_id ON chat_state_transitions(chat_id);
CREATE INDEX idx_transitions_created_at ON chat_state_transitions(created_at);

-- 4. Crear tabla de métricas de tiempo de respuesta
CREATE TABLE chat_response_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES users(id),
  first_response_seconds INTEGER,
  avg_response_seconds INTEGER,
  max_response_seconds INTEGER,
  total_agent_messages INTEGER DEFAULT 0,
  total_client_messages INTEGER DEFAULT 0,
  warnings_sent INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_metrics_chat_id ON chat_response_metrics(chat_id);
CREATE INDEX idx_metrics_agent_id ON chat_response_metrics(agent_id);
```

## 🔧 Actualización del Entity

```typescript
// backend/src/modules/chats/entities/chat.entity.ts

import { Entity, Column, Index } from 'typeorm';

@Entity('chats')
export class Chat {
  // ... campos existentes ...

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  subStatus: ChatSubStatus;

  @Column({ type: 'boolean', default: false })
  @Index()
  isBotActive: boolean;

  @Column({ type: 'timestamp', nullable: true })
  @Index()
  lastAgentMessageAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  @Index()
  lastClientMessageAt: Date;

  @Column({ type: 'integer', nullable: true })
  firstResponseTimeSeconds: number;

  @Column({ type: 'boolean', default: false })
  agentWarningSent: boolean;

  @Column({ type: 'boolean', default: false })
  clientWarningSent: boolean;

  @Column({ type: 'timestamp', nullable: true })
  @Index()
  autoCloseScheduledAt: Date;

  @Column({ type: 'integer', default: 0 })
  transferCount: number;

  @Column({ type: 'integer', default: 0 })
  botRestartCount: number;
}
```
