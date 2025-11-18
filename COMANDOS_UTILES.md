# 🛠️ Comandos Útiles - NGS&O CRM Gestión

## 🚀 Iniciar Proyecto

### Opción 1: Desarrollo Local (Actual)
```powershell
# Terminal 1: Base de datos
docker-compose up -d postgres redis

# Terminal 2: Backend
cd D:\crm-ngso-whatsapp\backend
npm run start:dev

# Terminal 3: Frontend
cd D:\crm-ngso-whatsapp\frontend
npm run dev
```

### Opción 2: Docker Completo (Futuro)
```powershell
# Todo en Docker
docker-compose up -d

# Ver logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

---

## 🔍 Verificación de Estado

### Backend
```powershell
# Compilar y verificar errores
cd D:\crm-ngso-whatsapp\backend
npm run build

# Ejecutar tests
npm run test

# Health check
curl http://localhost:3000/api/v1/health
```

### Frontend
```powershell
# Verificar errores TypeScript
cd D:\crm-ngso-whatsapp\frontend
npx tsc --noEmit

# Build de producción
npm run build

# Preview del build
npm run preview
```

### Base de Datos
```powershell
# Conectar a PostgreSQL
docker exec -it crm-postgres psql -U postgres -d crm_whatsapp

# Ejecutar script SQL
docker exec -i crm-postgres psql -U postgres -d crm_whatsapp < backend/scripts/validate-system.sql

# O desde fuera de Docker:
psql -U postgres -h localhost -p 5432 -d crm_whatsapp -f backend/scripts/validate-system.sql
```

---

## 📊 Scripts SQL Útiles

### Validar Sistema Completo
```sql
-- Ejecutar desde psql
\i backend/scripts/validate-system.sql
```

### Ver Usuarios y Roles
```sql
SELECT 
  u.email,
  u."fullName",
  u."isAgent",
  u."agentState",
  r.name as role,
  COUNT(rp."permissionId") as total_permissions
FROM users u
LEFT JOIN roles r ON u."roleId" = r.id
LEFT JOIN role_permissions rp ON r.id = rp."roleId"
GROUP BY u.id, u.email, u."fullName", u."isAgent", u."agentState", r.name
ORDER BY r.name, u.email;
```

### Ver Chats con Detalles
```sql
SELECT 
  c.id,
  c.status,
  c."contactName",
  c."contactPhone",
  cl."fullName" as client_name,
  cl."debtAmount",
  cl."daysOverdue",
  cl.priority,
  u."fullName" as agent_name,
  COUNT(m.id) as total_messages
FROM chats c
LEFT JOIN clients cl ON c."clientId" = cl.id
LEFT JOIN users u ON c."assignedAgentId" = u.id
LEFT JOIN messages m ON c.id = m."chatId"
GROUP BY c.id, cl."fullName", cl."debtAmount", cl."daysOverdue", cl.priority, u."fullName"
ORDER BY cl."daysOverdue" DESC NULLS LAST;
```

### Ver Métricas de Agentes
```sql
SELECT 
  u."fullName" as agent,
  u."agentState" as estado,
  u."maxConcurrentChats" as max_chats,
  COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'active') as chats_activos,
  COUNT(DISTINCT m.id) FILTER (
    WHERE m.direction = 'outbound' 
    AND m."createdAt" >= CURRENT_DATE
  ) as mensajes_hoy,
  COUNT(DISTINCT cl.id) FILTER (
    WHERE cl."collectionStatus" = 'promise'
    AND cl."promisePaymentDate" >= CURRENT_DATE
  ) as promesas_hoy
FROM users u
LEFT JOIN chats c ON u.id = c."assignedAgentId"
LEFT JOIN messages m ON c.id = m."chatId"
LEFT JOIN clients cl ON c."clientId" = cl.id
WHERE u."isAgent" = true
GROUP BY u.id, u."fullName", u."agentState", u."maxConcurrentChats"
ORDER BY chats_activos DESC;
```

### Crear Usuario de Prueba
```sql
-- Crear supervisor
INSERT INTO users (
  id,
  email,
  password,
  "fullName",
  "firstName",
  "lastName",
  "roleId",
  "isAgent",
  "isActive"
) VALUES (
  gen_random_uuid(),
  'supervisor@crm.com',
  '$2b$10$IQ/XlMFHCpJn6TLG52nm7e9f9WQU5H7GqKZ7aJYZ0V8kQZ8kQZ8kQ',
  'Carlos Supervisor',
  'Carlos',
  'Supervisor',
  (SELECT id FROM roles WHERE name = 'Supervisor'),
  false,
  true
);

-- Crear agente
INSERT INTO users (
  id,
  email,
  password,
  "fullName",
  "firstName",
  "lastName",
  "roleId",
  "isAgent",
  "agentState",
  "maxConcurrentChats",
  "isActive"
) VALUES (
  gen_random_uuid(),
  'nuevogente@crm.com',
  '$2b$10$IQ/XlMFHCpJn6TLG52nm7e9f9WQU5H7GqKZ7aJYZ0V8kQZ8kQZ8kQ',
  'María López',
  'María',
  'López',
  (SELECT id FROM roles WHERE name = 'Agente'),
  true,
  'offline',
  5,
  true
);
```

### Agregar Permiso a Rol
```sql
INSERT INTO role_permissions ("roleId", "permissionId")
SELECT 
  r.id,
  p.id
FROM roles r, permissions p
WHERE r.name = 'Agente'
  AND p.module = 'tasks'
  AND p.action = 'create'
ON CONFLICT DO NOTHING;
```

### Limpiar Datos de Prueba
```sql
-- CUIDADO: Esto elimina TODOS los datos de prueba
TRUNCATE TABLE messages CASCADE;
TRUNCATE TABLE chats CASCADE;
TRUNCATE TABLE tasks CASCADE;
TRUNCATE TABLE audit_logs CASCADE;

-- Mantener usuarios, roles, permisos y clientes
-- NO ejecutar TRUNCATE en: users, roles, permissions, role_permissions, clients
```

---

## 🐛 Debugging

### Ver Logs del Backend
```powershell
# Si backend en terminal
# Los logs aparecen directamente en la consola

# Si backend en Docker
docker logs -f crm-backend
```

### Ver Logs de PostgreSQL
```powershell
docker logs -f crm-postgres
```

### Ver Queries SQL en Tiempo Real
```sql
-- Conectar a PostgreSQL y ejecutar:
SELECT 
  pid,
  now() - query_start as duration,
  state,
  query
FROM pg_stat_activity
WHERE state != 'idle'
  AND query NOT LIKE '%pg_stat_activity%'
ORDER BY duration DESC;
```

### Debug de WebSocket
```javascript
// En consola del navegador (F12):
// Ver eventos de Socket.IO
socket.on('connect', () => console.log('Connected:', socket.id));
socket.on('disconnect', () => console.log('Disconnected'));
socket.on('chat.assigned', (data) => console.log('Chat assigned:', data));
socket.on('message.received', (data) => console.log('Message:', data));

// Ver todos los eventos
socket.onAny((event, ...args) => console.log(event, args));
```

### Verificar JWT Token
```javascript
// En consola del navegador:
const token = localStorage.getItem('token');
console.log('Token:', token);

// Decodificar JWT (sin verificar firma)
function parseJwt(token) {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(
    atob(base64).split('').map(c => 
      '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
    ).join('')
  );
  return JSON.parse(jsonPayload);
}

console.log('Decoded:', parseJwt(token));
```

---

## 🧪 Testing de API

### Con curl (PowerShell)
```powershell
# Login
$response = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/auth/login" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"email":"admin@crm.com","password":"password123"}'

$token = $response.access_token
Write-Host "Token: $token"

# Get Dashboard Stats
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/reports/system/stats" `
  -Method GET `
  -Headers @{ Authorization = "Bearer $token" }

# Get Agents Performance
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/reports/agents/performance" `
  -Method GET `
  -Headers @{ Authorization = "Bearer $token" }

# Get All Chats
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/chats" `
  -Method GET `
  -Headers @{ Authorization = "Bearer $token" }
```

### Con Postman
```
1. Crear colección "NGS&O CRM"
2. Agregar variable de entorno: baseUrl = http://localhost:3000/api/v1
3. Crear requests:

POST {{baseUrl}}/auth/login
Body:
{
  "email": "admin@crm.com",
  "password": "password123"
}

GET {{baseUrl}}/reports/system/stats
Headers:
  Authorization: Bearer {{token}}

GET {{baseUrl}}/reports/agents/performance
Headers:
  Authorization: Bearer {{token}}

GET {{baseUrl}}/chats
Headers:
  Authorization: Bearer {{token}}
```

---

## 🔐 Gestión de Contraseñas

### Generar Hash de Contraseña
```javascript
// Ejecutar en consola de Node.js:
const bcrypt = require('bcrypt');

async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);
  console.log('Hash:', hash);
}

hashPassword('password123');
```

### Verificar Hash
```javascript
const bcrypt = require('bcrypt');

async function verifyPassword(password, hash) {
  const isValid = await bcrypt.compare(password, hash);
  console.log('Valid:', isValid);
}

verifyPassword(
  'password123',
  '$2b$10$IQ/XlMFHCpJn6TLG52nm7e9f9WQU5H7GqKZ7aJYZ0V8kQZ8kQZ8kQ'
);
```

---

## 📦 Gestión de Dependencias

### Backend
```powershell
cd backend

# Instalar dependencias
npm install

# Actualizar dependencias (con cuidado)
npm update

# Auditoría de seguridad
npm audit

# Corregir vulnerabilidades
npm audit fix

# Ver paquetes desactualizados
npm outdated
```

### Frontend
```powershell
cd frontend

# Instalar dependencias
npm install

# Agregar nueva dependencia
npm install recharts

# Agregar dependencia de desarrollo
npm install -D @types/node

# Remover dependencia
npm uninstall lodash

# Ver tamaño del bundle
npm run build
npx vite-bundle-visualizer
```

---

## 🐳 Docker

### Gestión de Contenedores
```powershell
# Ver contenedores activos
docker ps

# Ver todos los contenedores
docker ps -a

# Detener todos los contenedores
docker-compose down

# Detener y eliminar volúmenes (CUIDADO: borra datos)
docker-compose down -v

# Reconstruir imágenes
docker-compose build

# Reiniciar un contenedor
docker-compose restart postgres

# Ver uso de recursos
docker stats
```

### Limpieza de Docker
```powershell
# Eliminar contenedores parados
docker container prune

# Eliminar imágenes sin usar
docker image prune

# Eliminar volúmenes sin usar
docker volume prune

# Limpiar todo (CUIDADO)
docker system prune -a --volumes
```

---

## 📊 Monitoreo

### Ver Estado de Servicios
```powershell
# PostgreSQL
docker exec crm-postgres pg_isready -U postgres

# Redis
docker exec crm-redis redis-cli ping

# Backend
curl http://localhost:3000/api/v1/health

# Frontend
curl http://localhost:5173
```

### Ver Uso de Memoria
```sql
-- En PostgreSQL
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## 🚀 Despliegue

### Build de Producción
```powershell
# Backend
cd backend
npm run build
# Output: dist/

# Frontend
cd frontend
npm run build
# Output: dist/

# Verificar archivos estáticos
ls frontend/dist
```

### Variables de Entorno
```powershell
# Backend .env.production
DATABASE_URL=postgresql://user:pass@host:5432/crm_whatsapp
JWT_SECRET=production-secret-key
REDIS_URL=redis://host:6379
NODE_ENV=production

# Frontend .env.production
VITE_API_URL=https://api.ngsocrm.com/api/v1
VITE_WS_URL=wss://api.ngsocrm.com
```

---

## 📚 Documentación

### Generar Documentación de API
```powershell
# Backend tiene Swagger integrado
# Acceder a: http://localhost:3000/api/docs

# Exportar JSON
curl http://localhost:3000/api/docs-json > api-documentation.json
```

### Generar Docs de Código
```powershell
# TypeDoc para TypeScript
cd backend
npx typedoc --out docs src

cd frontend
npx typedoc --out docs src
```

---

**Última actualización:** 16 de Noviembre, 2025  
**Autor:** Alejandro Sandoval - AS Software
