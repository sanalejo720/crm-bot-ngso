# 🧪 GUÍA COMPLETA DE TESTING - NGS&O CRM GESTIÓN

## 📋 Índice

1. [Scripts de Backend (PowerShell)](#scripts-de-backend)
2. [Scripts de Frontend (JavaScript)](#scripts-de-frontend)
3. [Flujos de Prueba Completos](#flujos-completos)
4. [Guía de Ejecución](#guía-de-ejecución)
5. [Troubleshooting](#troubleshooting)

---

## 🎯 Scripts de Backend

### Ubicación
```
D:\crm-ngso-whatsapp\backend\scripts\
```

### Scripts Disponibles

#### 1. test-auth.ps1
**Propósito:** Pruebas de autenticación y sesiones

**Endpoints probados:**
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/logout`
- `POST /api/v1/auth/2fa/generate`

**Casos de prueba:**
- ✅ Registro de usuario
- ✅ Login exitoso
- ✅ Login fallido (credenciales incorrectas)
- ✅ Obtener perfil autenticado
- ✅ Acceso sin token (debe fallar)
- ✅ Token inválido (debe fallar)
- ✅ Generación de 2FA
- ✅ Logout

**Ejecución:**
```powershell
.\test-auth.ps1
```

---

#### 2. test-campaigns.ps1
**Propósito:** Pruebas de gestión de campañas

**Endpoints probados:**
- `POST /api/v1/campaigns`
- `GET /api/v1/campaigns`
- `GET /api/v1/campaigns/active`
- `GET /api/v1/campaigns/:id`
- `GET /api/v1/campaigns/:id/stats`
- `PATCH /api/v1/campaigns/:id`
- `PATCH /api/v1/campaigns/:id/status`
- `POST /api/v1/campaigns/:id/activate`
- `POST /api/v1/campaigns/:id/pause`

**Casos de prueba:**
- ✅ Crear campaña
- ✅ Listar campañas
- ✅ Filtrar por estado
- ✅ Obtener estadísticas
- ✅ Actualizar configuración
- ✅ Activar/pausar campaña

**Ejecución:**
```powershell
.\test-campaigns.ps1
```

---

#### 3. test-chats.ps1
**Propósito:** Pruebas de gestión de chats

**Endpoints probados:**
- `POST /api/v1/chats`
- `GET /api/v1/chats`
- `GET /api/v1/chats/my-chats`
- `GET /api/v1/chats/waiting/:campaignId`
- `PATCH /api/v1/chats/:id/assign`
- `PATCH /api/v1/chats/:id/status`

**Casos de prueba:**
- ✅ Crear chat nuevo
- ✅ Listar todos los chats
- ✅ Obtener mis chats asignados
- ✅ Ver chats en cola
- ✅ Asignar chat a agente
- ✅ Cambiar estado del chat
- ✅ Filtros (estado, campaña)

**Ejecución:**
```powershell
.\test-chats.ps1
```

---

#### 4. test-messages.ps1
**Propósito:** Pruebas de mensajería

**Endpoints probados:**
- `POST /api/v1/messages/send`
- `GET /api/v1/messages/chat/:chatId`
- `GET /api/v1/messages/:id`

**Casos de prueba:**
- ✅ Enviar mensaje de texto
- ✅ Enviar múltiples mensajes
- ✅ Mensaje con emoji
- ✅ Mensaje largo
- ✅ Caracteres especiales
- ✅ Obtener historial
- ✅ Paginación
- ✅ Mensaje vacío (debe fallar)

**Ejecución:**
```powershell
.\test-messages.ps1
```

---

#### 5. test-reports.ps1
**Propósito:** Pruebas de reportes y métricas

**Endpoints probados:**
- `GET /api/v1/reports/system`
- `GET /api/v1/reports/system/stats`
- `GET /api/v1/reports/agent/stats`
- `GET /api/v1/reports/agent/activity`

**Casos de prueba:**
- ✅ Métricas del sistema
- ✅ Estadísticas generales
- ✅ Estadísticas de agente
- ✅ Actividad reciente
- ✅ Métricas en tiempo real

**Ejecución:**
```powershell
.\test-reports.ps1
```

---

#### 6. test-users.ps1
**Propósito:** Pruebas de gestión de usuarios

**Endpoints probados:**
- `POST /api/v1/users`
- `GET /api/v1/users`
- `GET /api/v1/users/:id`
- `GET /api/v1/users/available-agents`
- `PATCH /api/v1/users/:id`
- `PATCH /api/v1/users/:id/status`
- `PATCH /api/v1/users/:id/password`

**Casos de prueba:**
- ✅ Crear usuario
- ✅ Listar usuarios
- ✅ Filtros (rol, estado, campaña)
- ✅ Actualizar datos
- ✅ Cambiar password
- ✅ Activar/desactivar
- ✅ Asignar campañas

**Ejecución:**
```powershell
.\test-users.ps1
```

---

#### 7. test-flow-complete.ps1
**Propósito:** Flujo completo de atención al cliente

**Flujo simulado:**
1. Autenticación (Admin, Supervisor, Agente)
2. Crear chat desde WhatsApp
3. Verificar chat en cola
4. Asignar a agente
5. Agente ve el chat
6. Agente activa el chat
7. Conversación (8 mensajes)
8. Cierre del chat
9. Estadísticas finales

**Duración:** ~30-40 segundos

**Ejecución:**
```powershell
.\test-flow-complete.ps1
```

---

#### 8. test-all.ps1
**Propósito:** Suite completa de pruebas

**Características:**
- Ejecuta todos los módulos secuencialmente
- Genera reporte final con métricas
- Muestra tasa de éxito
- Calcula tiempos de ejecución

**Duración:** ~2-3 minutos

**Ejecución:**
```powershell
.\test-all.ps1
```

**Salida esperada:**
```
╔════════════════════════════════════════════════════╗
║              RESUMEN DE PRUEBAS                    ║
╚════════════════════════════════════════════════════╝

📊 RESULTADOS:
   Total de módulos probados: 6
   ✅ Exitosos: 6
   ❌ Fallidos: 0

⏱️  TIEMPOS:
   Duración total: 165.00 segundos

📈 TASA DE ÉXITO: 100.00%
```

---

## 🌐 Scripts de Frontend

### Ubicación
```
D:\crm-ngso-whatsapp\frontend\tests\
```

### Scripts Disponibles

#### 1. api-tests.js
**Propósito:** Pruebas de llamadas a la API desde el navegador

**Uso:**
1. Abrir la aplicación frontend en el navegador
2. Abrir DevTools (F12)
3. Copiar y pegar el contenido de `api-tests.js`
4. Ejecutar: `runAllTests()`

**Módulos probados:**
- 🔐 Autenticación
- 💬 Chats
- 📨 Mensajes
- 📊 Reportes
- 📢 Campañas

**Comandos disponibles:**
```javascript
// Ejecutar todas las pruebas
runAllTests()

// Pruebas individuales
testSuite.auth()
testSuite.chats()
testSuite.messages(chatId)
testSuite.reports()
testSuite.campaigns()

// Hacer request directo
testSuite.api('/chats/my-chats', 'GET')
```

**Ejemplo de salida:**
```
╔════════════════════════════════════════════════════╗
║      NGS&O CRM GESTIÓN - FRONTEND TEST SUITE      ║
╚════════════════════════════════════════════════════╝

🔐 PRUEBAS DE AUTENTICACIÓN
✅ Login exitoso
✅ Perfil obtenido

💬 PRUEBAS DE CHATS
✅ Mis chats obtenidos - Total: 5 chats
✅ Chat creado exitosamente

⏱️ Duración total: 3.42 segundos
```

---

#### 2. socket-tests.js
**Propósito:** Pruebas de conexiones WebSocket y eventos en tiempo real

**Uso:**
1. Abrir AgentWorkspace en el navegador
2. Abrir DevTools (F12)
3. Copiar y pegar el contenido de `socket-tests.js`
4. Ejecutar: `runSocketTests()`

**Pruebas realizadas:**
- ✅ Verificar socket existente
- ✅ Registrar event listeners
- ✅ Emitir eventos al servidor
- ✅ Verificar estado de conexión
- ✅ Simular desconexión/reconexión
- ✅ Log de eventos

**Comandos disponibles:**
```javascript
// Suite completa
runSocketTests()

// Pruebas individuales
socketTests.testExisting()
socketTests.testListeners()
socketTests.testEmit()
socketTests.testConnection()
socketTests.testReconnection()
socketTests.showLog()
socketTests.cleanup()
```

**Eventos monitoreados:**
- `chat:assigned` - Chat asignado al agente
- `message:new` - Nuevo mensaje recibido
- `chat:status` - Cambio de estado del chat
- `*` (todos los eventos)

---

## 🔄 Flujos de Prueba Completos

### Flujo 1: Onboarding de Cliente Nuevo

**Objetivo:** Simular un cliente nuevo contactando por primera vez

**Pasos:**
1. Ejecutar `test-flow-complete.ps1`
2. Verifica:
   - ✅ Chat creado automáticamente
   - ✅ Auto-asignación a agente disponible
   - ✅ Notificación en tiempo real
   - ✅ Conversación completa
   - ✅ Cierre y estadísticas

**Duración:** ~40 segundos

---

### Flujo 2: Prueba de Carga - Múltiples Chats

**Objetivo:** Crear múltiples chats simultáneos

**Script personalizado:**
```powershell
# Crear 10 chats en paralelo
1..10 | ForEach-Object -Parallel {
    .\test-chats.ps1
} -ThrottleLimit 5
```

---

### Flujo 3: Verificación Completa del Sistema

**Objetivo:** Validar todos los módulos

**Pasos:**
```powershell
# Backend - Todos los módulos
.\test-all.ps1

# Frontend - API Calls
# (En navegador) runAllTests()

# Frontend - WebSockets
# (En AgentWorkspace) runSocketTests()
```

**Duración:** ~5 minutos total

---

## 📖 Guía de Ejecución

### Configuración Inicial

1. **Iniciar Backend:**
```powershell
cd D:\crm-ngso-whatsapp\backend
npm run start:dev
```

2. **Iniciar Frontend:**
```powershell
cd D:\crm-ngso-whatsapp\frontend
npm run dev
```

3. **Verificar Base de Datos:**
```sql
-- Conectar a PostgreSQL
psql -U postgres -d ngso_crm

-- Verificar datos
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM campaigns;
SELECT COUNT(*) FROM chats;
```

---

### Ejecución de Pruebas Backend

```powershell
# Navegar al directorio
cd D:\crm-ngso-whatsapp\backend\scripts

# Ejecutar script individual
.\test-auth.ps1

# Ejecutar suite completa
.\test-all.ps1

# Ejecutar con output detallado
.\test-all.ps1 -Verbose

# Guardar resultados
.\test-all.ps1 > test-results.log
```

---

### Ejecución de Pruebas Frontend

**API Tests:**
```javascript
// 1. Abrir http://localhost:5173
// 2. Login como agente
// 3. F12 para abrir DevTools
// 4. Copiar contenido de api-tests.js
// 5. Pegar en consola
// 6. Ejecutar:
runAllTests()
```

**Socket Tests:**
```javascript
// 1. Abrir http://localhost:5173/workspace
// 2. Login como agente
// 3. F12 para abrir DevTools
// 4. Copiar contenido de socket-tests.js
// 5. Pegar en consola
// 6. Ejecutar:
runSocketTests()
```

---

## 🐛 Troubleshooting

### Problema: Backend no disponible

**Síntoma:**
```
❌ Backend no disponible en http://localhost:3000/api/v1
```

**Solución:**
```powershell
# Verificar si el backend está corriendo
Get-Process node

# Si no está corriendo, iniciarlo
cd D:\crm-ngso-whatsapp\backend
npm run start:dev

# Verificar puerto 3000
netstat -ano | findstr :3000
```

---

### Problema: Error de autenticación

**Síntoma:**
```
❌ Error en autenticación: 401 Unauthorized
```

**Solución:**
```powershell
# Resetear passwords
cd D:\crm-ngso-whatsapp\backend
psql -U postgres -d ngso_crm -f scripts/reset-passwords.sql

# Verificar usuarios
psql -U postgres -d ngso_crm -c "SELECT email, status FROM users;"
```

---

### Problema: Socket no conecta

**Síntoma:**
```
❌ Socket service no disponible
```

**Solución:**
1. Verificar que estés en AgentWorkspace
2. Refresh de página (Ctrl+R)
3. Verificar en Network tab que WebSocket conecta
4. Revisar CORS en backend

---

### Problema: Tests fallan aleatoriamente

**Causa:** Timing issues

**Solución:**
```powershell
# Aumentar delays en el script
# Editar test-*.ps1 y aumentar:
Start-Sleep -Seconds 3  # En lugar de 1
```

---

## 📊 Interpretación de Resultados

### Códigos de Color

| Color | Significado | Ejemplo |
|-------|-------------|---------|
| 🟢 Verde | Éxito | `✅ Test exitoso` |
| 🔴 Rojo | Fallo | `❌ Error crítico` |
| 🟡 Amarillo | Advertencia | `⚠️ Timeout` |
| 🔵 Azul | Información | `ℹ️ Procesando...` |

---

### Métricas Importantes

**Tasa de Éxito:**
- ✅ 100% - Excelente
- ⚠️ 80-99% - Aceptable (revisar fallos)
- ❌ <80% - Crítico (investigar)

**Tiempo de Respuesta:**
- ✅ <200ms - Excelente
- ⚠️ 200-500ms - Aceptable
- ❌ >500ms - Lento (optimizar)

---

## 🎯 Best Practices

### 1. Ejecutar tests regularmente
```powershell
# Diario antes de commit
.\test-all.ps1

# Después de cambios importantes
.\test-flow-complete.ps1
```

### 2. Mantener datos de prueba limpios
```sql
-- Limpiar chats de prueba
DELETE FROM chats WHERE contact_name LIKE 'Cliente Prueba%';
DELETE FROM chats WHERE contact_name LIKE 'Cliente Test%';
```

### 3. Documentar fallos
```powershell
# Guardar log de errores
.\test-all.ps1 2>&1 | Out-File -FilePath "errors-$(Get-Date -Format 'yyyy-MM-dd').log"
```

### 4. Versionar scripts
```bash
git add backend/scripts/*.ps1
git commit -m "test: actualizar scripts de prueba"
```

---

## 📝 Checklist de Testing

### Antes de Deployment

- [ ] `test-all.ps1` ejecutado sin errores
- [ ] `test-flow-complete.ps1` completado exitosamente
- [ ] Tests de frontend (API + Socket) pasando
- [ ] No hay errores en logs del backend
- [ ] Base de datos en estado consistente
- [ ] Todos los usuarios de prueba funcionando

### Después de Cambios en API

- [ ] Actualizar scripts afectados
- [ ] Ejecutar test del módulo modificado
- [ ] Verificar que no rompe otros módulos
- [ ] Actualizar documentación si es necesario

---

## 🚀 Próximos Pasos

### Testing Avanzado

1. **Tests de Integración con Cypress**
2. **Tests de Carga con Artillery**
3. **Tests E2E automatizados**
4. **CI/CD Pipeline con tests automáticos**

### Métricas Adicionales

1. **Code Coverage**
2. **Performance Profiling**
3. **Memory Leak Detection**
4. **API Response Time Monitoring**

---

## 📚 Referencias

- [Documentación Backend](../backend/README.md)
- [Documentación Frontend](../frontend/README.md)
- [API Endpoints](../API_ENDPOINTS.md)
- [Arquitectura del Sistema](../ARQUITECTURA.md)

---

## 👨‍💻 Desarrollado por

**AS Software - Alejandro Sandoval**  
NGS&O CRM Gestión - 2024

---

## 📄 Licencia

Uso interno - NGS&O CRM Gestión
