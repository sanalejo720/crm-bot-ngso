-- Script de Validación Completa del Sistema
-- NGS&O CRM Gestión - Desarrollado por Alejandro Sandoval - AS Software

\echo '================================================'
\echo 'VALIDACIÓN COMPLETA DEL SISTEMA'
\echo '================================================'
\echo ''

-- 1. VALIDAR ROLES
\echo '1. ROLES EN EL SISTEMA'
\echo '--------------------'
SELECT 
    name as rol,
    description as descripcion,
    (SELECT COUNT(*) FROM users WHERE "roleId" = roles.id) as usuarios_asignados,
    (SELECT COUNT(*) FROM role_permissions WHERE "roleId" = roles.id) as permisos_asignados
FROM roles
ORDER BY name;
\echo ''

-- 2. VALIDAR PERMISOS POR ROL
\echo '2. PERMISOS POR ROL'
\echo '--------------------'
SELECT 
    r.name as rol,
    p.module || ':' || p.action as permiso,
    p.description
FROM roles r
JOIN role_permissions rp ON r.id = rp."roleId"
JOIN permissions p ON p.id = rp."permissionId"
ORDER BY r.name, p.module, p.action;
\echo ''

-- 3. VALIDAR USUARIOS
\echo '3. USUARIOS DEL SISTEMA'
\echo '--------------------'
SELECT 
    u."fullName" as nombre,
    u.email,
    r.name as rol,
    u."isAgent" as es_agente,
    u."agentState" as estado_agente,
    u."maxConcurrentChats" as max_chats,
    u."currentChatsCount" as chats_actuales,
    u.status as estado
FROM users u
LEFT JOIN roles r ON u."roleId" = r.id
ORDER BY r.name, u."fullName";
\echo ''

-- 4. VALIDAR CLIENTES CON DEUDAS
\echo '4. CLIENTES DEUDORES'
\echo '--------------------'
SELECT 
    "fullName" as nombre,
    phone as telefono,
    "debtAmount" as deuda,
    "daysOverdue" as dias_mora,
    "collectionStatus" as estado_cobranza,
    priority as prioridad,
    "documentNumber" as documento
FROM clients
WHERE "debtAmount" > 0
ORDER BY "daysOverdue" DESC, "debtAmount" DESC;
\echo ''

-- 5. VALIDAR CHATS ASIGNADOS
\echo '5. CHATS ASIGNADOS A AGENTES'
\echo '--------------------'
SELECT 
    u."fullName" as agente,
    c.id as chat_id,
    c."contactName" as contacto,
    c."contactPhone" as telefono,
    c.status as estado_chat,
    c.priority as prioridad,
    c."unreadCount" as mensajes_sin_leer,
    cl."fullName" as cliente,
    cl."debtAmount" as deuda,
    cl."daysOverdue" as dias_mora
FROM chats c
LEFT JOIN users u ON c."assignedAgentId" = u.id
LEFT JOIN clients cl ON c."clientId" = cl.id
WHERE c."assignedAgentId" IS NOT NULL
ORDER BY u."fullName", c.priority DESC;
\echo ''

-- 6. VALIDAR CAMPAÑAS
\echo '6. CAMPAÑAS ACTIVAS'
\echo '--------------------'
SELECT 
    name as nombre,
    description as descripcion,
    status as estado,
    "startDate" as fecha_inicio,
    "endDate" as fecha_fin,
    (SELECT COUNT(*) FROM chats WHERE "campaignId" = campaigns.id) as total_chats,
    (SELECT COUNT(*) FROM whatsapp_numbers WHERE "campaignId" = campaigns.id) as numeros_whatsapp
FROM campaigns
ORDER BY "createdAt" DESC;
\echo ''

-- 7. VALIDAR NÚMEROS DE WHATSAPP
\echo '7. NÚMEROS DE WHATSAPP CONFIGURADOS'
\echo '--------------------'
SELECT 
    "phoneNumber" as numero,
    "displayName" as nombre,
    provider as proveedor,
    status as estado,
    "isActive" as activo,
    c.name as campana,
    "lastConnectedAt" as ultima_conexion
FROM whatsapp_numbers wn
LEFT JOIN campaigns c ON wn."campaignId" = c.id
ORDER BY "isActive" DESC, "phoneNumber";
\echo ''

-- 8. VALIDAR INTEGRIDAD DE DATOS
\echo '8. VALIDACIÓN DE INTEGRIDAD'
\echo '--------------------'

\echo 'Chats sin agente asignado:'
SELECT COUNT(*) as total FROM chats WHERE "assignedAgentId" IS NULL AND status != 'closed';

\echo 'Chats sin cliente relacionado:'
SELECT COUNT(*) as total FROM chats WHERE "clientId" IS NULL;

\echo 'Clientes sin datos de cobranza:'
SELECT COUNT(*) as total FROM clients WHERE "debtAmount" IS NULL OR "daysOverdue" IS NULL;

\echo 'Usuarios sin rol asignado:'
SELECT COUNT(*) as total FROM users WHERE "roleId" IS NULL;

\echo 'Roles sin permisos:'
SELECT COUNT(*) as total FROM roles r 
WHERE NOT EXISTS (SELECT 1 FROM role_permissions WHERE "roleId" = r.id);
\echo ''

-- 9. ESTADÍSTICAS GENERALES
\echo '9. ESTADÍSTICAS GENERALES'
\echo '--------------------'
SELECT 
    'Total Usuarios' as metrica,
    COUNT(*) as valor
FROM users
UNION ALL
SELECT 
    'Agentes Activos',
    COUNT(*)
FROM users
WHERE "isAgent" = true AND status = 'active'
UNION ALL
SELECT 
    'Total Clientes',
    COUNT(*)
FROM clients
UNION ALL
SELECT 
    'Clientes con Deuda',
    COUNT(*)
FROM clients
WHERE "debtAmount" > 0
UNION ALL
SELECT 
    'Deuda Total (COP)',
    SUM("debtAmount")::bigint
FROM clients
WHERE "debtAmount" > 0
UNION ALL
SELECT 
    'Total Chats',
    COUNT(*)
FROM chats
UNION ALL
SELECT 
    'Chats Activos',
    COUNT(*)
FROM chats
WHERE status = 'active'
UNION ALL
SELECT 
    'Total Mensajes',
    COUNT(*)
FROM messages
UNION ALL
SELECT 
    'Total Tareas',
    COUNT(*)
FROM tasks;
\echo ''

-- 10. VERIFICAR PERMISOS FALTANTES PARA AGENTES
\echo '10. PERMISOS CRÍTICOS PARA AGENTES'
\echo '--------------------'
WITH permisos_necesarios AS (
    SELECT unnest(ARRAY[
        'chats:read',
        'chats:update',
        'chats:assign',
        'messages:create',
        'messages:read',
        'messages:send',
        'clients:read',
        'clients:update',
        'tasks:create',
        'tasks:read',
        'tasks:update'
    ]) as permiso_nombre
),
permisos_agente AS (
    SELECT 
        p.module || ':' || p.action as permiso_nombre
    FROM roles r
    JOIN role_permissions rp ON r.id = rp."roleId"
    JOIN permissions p ON p.id = rp."permissionId"
    WHERE r.name = 'Agente'
)
SELECT 
    pn.permiso_nombre as permiso,
    CASE 
        WHEN pa.permiso_nombre IS NOT NULL THEN '✓ Configurado'
        ELSE '✗ FALTANTE'
    END as estado
FROM permisos_necesarios pn
LEFT JOIN permisos_agente pa ON pn.permiso_nombre = pa.permiso_nombre
ORDER BY estado DESC, permiso;
\echo ''

\echo '================================================'
\echo 'VALIDACIÓN COMPLETADA'
\echo '================================================'
