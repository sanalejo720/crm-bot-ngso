-- Script para limpiar datos de prueba - Producción NGS&O CRM
-- MANTIENE: Superadmins, Supervisores, Agentes del Excel, Campañas, Roles
-- ELIMINA: Datos de prueba, chats, mensajes, clientes

-- Desactivar temporalmente las restricciones FK
SET session_replication_role = 'replica';

-- 1. Limpiar tablas de mensajes y chats
TRUNCATE TABLE messages CASCADE;
TRUNCATE TABLE chats CASCADE;
TRUNCATE TABLE chat_response_metrics CASCADE;
TRUNCATE TABLE chat_state_transitions CASCADE;

-- 2. Limpiar tablas de pagos y evidencias
TRUNCATE TABLE payment_records CASCADE;
TRUNCATE TABLE payment_evidences CASCADE;
TRUNCATE TABLE paz_y_salvos CASCADE;
TRUNCATE TABLE evidences CASCADE;

-- 3. Limpiar tablas de jornada laboral
TRUNCATE TABLE agent_workday_events CASCADE;
TRUNCATE TABLE agent_pauses CASCADE;
TRUNCATE TABLE agent_workdays CASCADE;
TRUNCATE TABLE agent_sessions CASCADE;

-- 4. Limpiar clientes y deudores
TRUNCATE TABLE clients CASCADE;
TRUNCATE TABLE client_phone_numbers CASCADE;
TRUNCATE TABLE debtors CASCADE;
TRUNCATE TABLE unidentified_clients CASCADE;

-- 5. Limpiar otras tablas de operación
TRUNCATE TABLE daily_operations CASCADE;
TRUNCATE TABLE tasks CASCADE;
TRUNCATE TABLE audit_logs CASCADE;

-- Reactivar restricciones FK
SET session_replication_role = 'origin';

-- 6. Eliminar agentes de prueba
DELETE FROM users WHERE email LIKE '%prueba%';

-- 7. Resetear contadores de chats de usuarios
UPDATE users SET "currentChatsCount" = 0;

-- Verificar usuarios restantes
SELECT 
    CASE 
        WHEN r.name = 'Agente' THEN 'AGENTE'
        ELSE 'ADMIN/SUPER'
    END as tipo,
    COUNT(*) as cantidad
FROM users u
LEFT JOIN roles r ON u."roleId" = r.id
GROUP BY r.name
ORDER BY tipo;
