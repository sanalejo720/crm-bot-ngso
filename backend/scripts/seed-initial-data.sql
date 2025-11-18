-- Script para crear datos iniciales
-- Ejecutar después de que TypeORM haya creado las tablas

-- Insertar permisos básicos
INSERT INTO permissions (id, module, action, description, "createdAt") VALUES
-- Auth
(gen_random_uuid(), 'auth', 'login', 'Iniciar sesión', NOW()),
(gen_random_uuid(), 'auth', 'logout', 'Cerrar sesión', NOW()),
(gen_random_uuid(), 'auth', '2fa', 'Gestionar 2FA', NOW()),

-- Users
(gen_random_uuid(), 'users', 'create', 'Crear usuarios', NOW()),
(gen_random_uuid(), 'users', 'read', 'Ver usuarios', NOW()),
(gen_random_uuid(), 'users', 'update', 'Actualizar usuarios', NOW()),
(gen_random_uuid(), 'users', 'delete', 'Eliminar usuarios', NOW()),

-- Roles
(gen_random_uuid(), 'roles', 'create', 'Crear roles', NOW()),
(gen_random_uuid(), 'roles', 'read', 'Ver roles', NOW()),
(gen_random_uuid(), 'roles', 'update', 'Actualizar roles', NOW()),
(gen_random_uuid(), 'roles', 'delete', 'Eliminar roles', NOW()),
(gen_random_uuid(), 'roles', 'assign-permissions', 'Asignar permisos', NOW()),

-- Campaigns
(gen_random_uuid(), 'campaigns', 'create', 'Crear campañas', NOW()),
(gen_random_uuid(), 'campaigns', 'read', 'Ver campañas', NOW()),
(gen_random_uuid(), 'campaigns', 'update', 'Actualizar campañas', NOW()),
(gen_random_uuid(), 'campaigns', 'delete', 'Eliminar campañas', NOW()),

-- WhatsApp
(gen_random_uuid(), 'whatsapp', 'read', 'Ver números WhatsApp', NOW()),
(gen_random_uuid(), 'whatsapp', 'configure', 'Configurar WhatsApp', NOW()),
(gen_random_uuid(), 'whatsapp', 'send', 'Enviar mensajes', NOW()),

-- Chats
(gen_random_uuid(), 'chats', 'read', 'Ver chats', NOW()),
(gen_random_uuid(), 'chats', 'assign', 'Asignar chats', NOW()),
(gen_random_uuid(), 'chats', 'transfer', 'Transferir chats', NOW()),
(gen_random_uuid(), 'chats', 'close', 'Cerrar chats', NOW()),

-- Messages
(gen_random_uuid(), 'messages', 'read', 'Ver mensajes', NOW()),
(gen_random_uuid(), 'messages', 'send', 'Enviar mensajes', NOW()),

-- Clients
(gen_random_uuid(), 'clients', 'create', 'Crear clientes', NOW()),
(gen_random_uuid(), 'clients', 'read', 'Ver clientes', NOW()),
(gen_random_uuid(), 'clients', 'update', 'Actualizar clientes', NOW()),
(gen_random_uuid(), 'clients', 'delete', 'Eliminar clientes', NOW()),
(gen_random_uuid(), 'clients', 'assign', 'Asignar clientes', NOW()),

-- Tasks
(gen_random_uuid(), 'tasks', 'create', 'Crear tareas', NOW()),
(gen_random_uuid(), 'tasks', 'read', 'Ver tareas', NOW()),
(gen_random_uuid(), 'tasks', 'update', 'Actualizar tareas', NOW()),
(gen_random_uuid(), 'tasks', 'delete', 'Eliminar tareas', NOW()),
(gen_random_uuid(), 'tasks', 'assign', 'Asignar tareas', NOW()),

-- Reports
(gen_random_uuid(), 'reports', 'system', 'Ver reportes del sistema', NOW()),
(gen_random_uuid(), 'reports', 'agents', 'Ver reportes de agentes', NOW()),
(gen_random_uuid(), 'reports', 'campaigns', 'Ver reportes de campañas', NOW()),

-- Audit
(gen_random_uuid(), 'audit', 'read', 'Ver auditoría', NOW())
ON CONFLICT DO NOTHING;

-- Insertar roles predefinidos
INSERT INTO roles (id, name, description, "isActive", "isSystem", "createdAt", "updatedAt") VALUES
(gen_random_uuid(), 'Super Admin', 'Acceso total al sistema', true, true, NOW(), NOW()),
(gen_random_uuid(), 'Supervisor', 'Supervisor de campaña', true, true, NOW(), NOW()),
(gen_random_uuid(), 'Agente', 'Agente de atención', true, true, NOW(), NOW()),
(gen_random_uuid(), 'Calidad', 'Analista de calidad', true, true, NOW(), NOW()),
(gen_random_uuid(), 'Auditoría', 'Auditor del sistema', true, true, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- Asignar todos los permisos al Super Admin
INSERT INTO role_permissions ("roleId", "permissionId")
SELECT 
    (SELECT id FROM roles WHERE name = 'Super Admin'),
    id
FROM permissions
ON CONFLICT DO NOTHING;

-- Asignar permisos al Supervisor
INSERT INTO role_permissions ("roleId", "permissionId")
SELECT 
    (SELECT id FROM roles WHERE name = 'Supervisor'),
    id
FROM permissions
WHERE module IN ('campaigns', 'chats', 'messages', 'clients', 'tasks', 'reports', 'whatsapp', 'users')
    AND action IN ('read', 'create', 'update', 'assign', 'transfer', 'send', 'close')
ON CONFLICT DO NOTHING;

-- Asignar permisos al Agente
INSERT INTO role_permissions ("roleId", "permissionId")
SELECT 
    (SELECT id FROM roles WHERE name = 'Agente'),
    id
FROM permissions
WHERE module IN ('chats', 'messages', 'clients', 'tasks')
    AND action IN ('read', 'send', 'update', 'create')
ON CONFLICT DO NOTHING;

-- Asignar permisos a Calidad
INSERT INTO role_permissions ("roleId", "permissionId")
SELECT 
    (SELECT id FROM roles WHERE name = 'Calidad'),
    id
FROM permissions
WHERE module IN ('chats', 'messages', 'reports', 'audit')
    AND action = 'read'
ON CONFLICT DO NOTHING;

-- Asignar permisos a Auditoría
INSERT INTO role_permissions ("roleId", "permissionId")
SELECT 
    (SELECT id FROM roles WHERE name = 'Auditoría'),
    id
FROM permissions
WHERE module IN ('audit', 'reports')
    AND action = 'read'
ON CONFLICT DO NOTHING;

-- Actualizar el usuario admin@crm.com para que tenga rol Super Admin
UPDATE users
SET "roleId" = (SELECT id FROM roles WHERE name = 'Super Admin')
WHERE email = 'admin@crm.com';

-- Verificación
SELECT 'Permisos creados:' as info, COUNT(*) as total FROM permissions;
SELECT 'Roles creados:' as info, COUNT(*) as total FROM roles;
SELECT 'Asignaciones creadas:' as info, COUNT(*) as total FROM role_permissions;
SELECT 'Usuario admin actualizado:' as info, email, r.name as role 
FROM users u 
LEFT JOIN roles r ON u."roleId" = r.id 
WHERE email = 'admin@crm.com';
