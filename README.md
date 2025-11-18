# 🚀 NGS&O CRM Gestión

**Sistema de Gestión de Cobranzas con WhatsApp**

Sistema profesional para gestión de cartera vencida y recuperación de deuda, con integración WhatsApp, bot conversacional automatizado y sistema multiagente para equipos de cobranzas.

**Desarrollado por:** Alejandro Sandoval - AS Software  
**Versión:** 1.0.0  
**Fecha:** Noviembre 2025

---

## 📋 Características Principales

### 🎯 Funcionalidades para Cobranzas
- **Multi-agente**: Soporte para 18-30 gestores de cobranza simultáneos
- **Gestión de Cartera**: Control de deuda, días de mora, promesas de pago
- **Priorización Inteligente**: URGENTE (>90d), ALTA (>30d), MEDIA (>15d), BAJA (<15d)
- **Bot de Cobranza**: Flujo automatizado con opciones de pago y agendamiento
- **Multi-número WhatsApp**: 1-10 números (Meta Cloud API + WPPConnect)
- **Asignación Automática**: 3 estrategias (Round Robin, Least Busy, Skills-Based)
- **CRM Especializado**: Clientes deudores, promesas de pago, tareas, notas
- **Reportes**: TMR, TMO, SPH, efectividad de cobranza, rankings
- **Auditoría Completa**: Trazabilidad de todas las gestiones

### 🔐 Seguridad
- JWT + Refresh Tokens
- 2FA con TOTP (Authenticator apps)
- RBAC con 5 roles predefinidos (Super Admin, Supervisor, Agente, Calidad, Auditoría)
- 48 permisos granulares (12 módulos × 4 acciones)
- Helmet para security headers
- CORS configurado

### ⚡ Performance
- PM2 en modo cluster
- Bull Queue con Redis para procesamiento asíncrono
- WebSocket (Socket.IO) para tiempo real
- Event-driven architecture con EventEmitter2
- PostgreSQL con TypeORM optimizado
- Nginx como reverse proxy con load balancing

### 📊 Módulos Implementados

1. **Auth** - Autenticación JWT + 2FA
2. **Users** - Gestión de agentes con estados (available/busy/break/offline)
3. **Roles** - RBAC completo con seeding de roles
4. **Campaigns** - Campañas con configuración de bots y asignación
5. **WhatsApp** - Integración dual (Meta + WPPConnect) con webhooks
6. **Chats** - Asignación, transferencia, historial
7. **Messages** - Envío/recepción con tracking de estado
8. **Queue** - Sistema de colas con estrategias configurables
9. **Bot** - Motor de bot con 7 tipos de nodos
10. **Gateway** - WebSocket en tiempo real con rooms
11. **Clients** - CRM con notas, tags, lead status
12. **Tasks** - Tareas con recordatorios automáticos (cron jobs)
13. **Reports** - Analytics completo con métricas
14. **Audit** - Logs automáticos de operaciones

## 🛠️ Stack Tecnológico

### Backend
- **Framework**: NestJS 10.3+
- **Lenguaje**: TypeScript 5.3+
- **Base de datos**: PostgreSQL 15+
- **ORM**: TypeORM 0.3.19
- **Cache/Queue**: Redis 7+ con Bull
- **WebSocket**: Socket.IO
- **Autenticación**: Passport JWT + 2FA
- **Validación**: class-validator, class-transformer
- **Documentación**: Swagger/OpenAPI

### Frontend (Planeado)
- **Framework**: React 18
- **Build Tool**: Vite
- **State Management**: Redux Toolkit
- **UI Library**: Material-UI (MUI)
- **Forms**: React Hook Form
- **HTTP Client**: Axios
- **WebSocket**: Socket.IO Client

### DevOps
- **Hosting**: Hostinger VPS KVM 8 (8GB RAM, 4 vCPU, 200GB SSD)
- **Web Server**: Nginx
- **Process Manager**: PM2
- **SSL**: Let's Encrypt (Certbot)
- **Monitoreo**: PM2 logs + Nginx logs
- **Backups**: Cron job automático (PostgreSQL)

## 📦 Instalación

### Prerrequisitos
- Node.js 20.x o superior
- PostgreSQL 15.x o superior
- Redis 7.x o superior
- npm o pnpm

### 1. Clonar el repositorio
```bash
git clone https://github.com/tu-usuario/crm-ngso-whatsapp.git
cd crm-ngso-whatsapp
```

### 2. Instalar dependencias
```bash
cd backend
npm install
```

### 3. Configurar variables de entorno
```bash
cp .env.example .env
nano .env
```

Variables principales:
```env
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=tu_password
DB_NAME=crm_whatsapp

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=tu_secret_muy_seguro
JWT_EXPIRES_IN=24h

# WhatsApp Meta Cloud API
META_WHATSAPP_TOKEN=tu_token
META_WHATSAPP_PHONE_NUMBER_ID=tu_phone_id

# WPPConnect
WPPCONNECT_SECRET_KEY=tu_secret
```

### 4. Ejecutar migraciones (opcional)
```bash
npm run typeorm:migration:run
```

### 5. Iniciar en desarrollo
```bash
npm run start:dev
```

El servidor estará disponible en:
- **API**: http://localhost:3000/api/v1
- **Swagger**: http://localhost:3000/api/docs

## 🚀 Deployment en Producción

Ver la [**Guía de Despliegue Completa**](./GUIA_DESPLIEGUE.md) para instrucciones detalladas de deployment en Hostinger VPS.

### Resumen rápido:
```bash
# 1. Compilar
npm run build

# 2. Iniciar con PM2
pm2 start dist/main.js --name crm-backend --instances 2 --exec-mode cluster
pm2 save

# 3. Configurar Nginx como reverse proxy
# Ver GUIA_DESPLIEGUE.md para configuración completa
```

## 📚 Documentación

- **[MAESTRO.MD](./MAESTRO.MD)** - Requisitos originales del proyecto
- **[ARQUITECTURA.md](./ARQUITECTURA.md)** - Diseño de arquitectura del sistema
- **[ARQUITECTURA_MODULAR.md](./ARQUITECTURA_MODULAR.md)** - Estructura modular detallada
- **[MODELO_DE_DATOS.md](./MODELO_DE_DATOS.md)** - Esquema de base de datos (32 tablas)
- **[API_ENDPOINTS.md](./API_ENDPOINTS.md)** - Documentación de 100+ endpoints
- **[ESTRUCTURA_PROYECTO.md](./ESTRUCTURA_PROYECTO.md)** - Organización de carpetas
- **[CODIGO_IMPLEMENTACION.md](./CODIGO_IMPLEMENTACION.md)** - Código completo implementado
- **[GUIA_DESPLIEGUE.md](./GUIA_DESPLIEGUE.md)** - Guía de deployment completa

## 🧪 Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Coverage
npm run test:cov
```

## 📊 Métricas y Monitoreo

### Métricas Implementadas
- **TMR (Tiempo Medio Respuesta)**: Tiempo desde primer mensaje cliente hasta respuesta agente
- **TMO (Tiempo Medio Operación)**: Duración total del chat
- **SPH (Sent Per Hour)**: Mensajes enviados por hora por agente
- **Rankings**: Top agentes por TMR, TMO, SPH, chats resueltos
- **Distribución**: Chats por estado, por campaña
- **Tendencias**: Gráficas de chats por día

### Monitoreo
```bash
# Logs en tiempo real
pm2 logs crm-backend

# Dashboard PM2
pm2 monit

# Logs de Nginx
sudo tail -f /var/log/nginx/crm-backend-access.log
```

## 🔑 Roles y Permisos

### Roles Predefinidos

1. **Super Admin** (48 permisos)
   - Acceso total al sistema
   - Gestión de usuarios, roles, campañas
   - Configuración global

2. **Supervisor** (36 permisos)
   - Monitoreo de agentes
   - Asignación y transferencia de chats
   - Reportes y analytics
   - Gestión de clientes y tareas

3. **Agente** (20 permisos)
   - Atención de chats asignados
   - Envío de mensajes
   - Gestión básica de clientes
   - Visualización de tareas propias

4. **Calidad** (28 permisos)
   - Visualización de chats y mensajes
   - Reportes completos
   - Auditoría de operaciones
   - Sin permisos de escritura

5. **Auditoría** (24 permisos)
   - Solo lectura de logs
   - Reportes y analytics
   - Trazabilidad completa

### Permisos por Módulo
Cada módulo tiene 4 acciones: `create`, `read`, `update`, `delete`

Ejemplo: `users:create`, `users:read`, `users:update`, `users:delete`

## 🔄 Flujo de Trabajo

### 1. Cliente envía mensaje
1. Webhook recibe mensaje de WhatsApp
2. Sistema crea/actualiza chat
3. Bot procesa mensaje (si está habilitado)
4. Cola asigna chat a agente disponible
5. Notificación en tiempo real vía WebSocket

### 2. Agente responde
1. Agente envía mensaje desde interfaz
2. Sistema envía a WhatsApp (Meta o WPPConnect)
3. Actualiza estado del mensaje
4. Emite evento para auditoría
5. Actualiza métricas (SPH)

### 3. Transferencia de chat
1. Agente solicita transferencia
2. Sistema valida permisos
3. Registra historial de transferencia
4. Notifica a nuevo agente
5. Log de auditoría automático

## 🐛 Troubleshooting

### Error: Cannot connect to PostgreSQL
```bash
# Verificar que PostgreSQL esté corriendo
sudo systemctl status postgresql

# Verificar credenciales en .env
```

### Error: Redis connection refused
```bash
# Iniciar Redis
sudo systemctl start redis-server

# Verificar conexión
redis-cli ping
```

### Error 502 Bad Gateway
```bash
# Verificar que el backend esté corriendo
pm2 status

# Verificar logs de Nginx
sudo tail -f /var/log/nginx/error.log
```

## 🤝 Contribución

Este es un proyecto privado para un cliente. No se aceptan contribuciones externas.

## 📝 Licencia

Propietario: NGSO  
Todos los derechos reservados.

## 📞 Soporte

Para asistencia técnica, contactar al equipo de desarrollo.

---

**Versión**: 1.0.0  
**Última actualización**: Noviembre 2025  
**Desarrollado por**: AS Software - Alejandro Sandoval
