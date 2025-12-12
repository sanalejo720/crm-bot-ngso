# Plan de Testing Completo - CRM WhatsApp NGS&O

## 🎯 Objetivo
Verificar que TODOS los endpoints y funcionalidades del sistema funcionen correctamente en producción.

---

## 1️⃣ AUTENTICACIÓN Y USUARIOS

### Backend Endpoints
- [ ] POST `/api/v1/auth/login` - Login de usuario
- [ ] POST `/api/v1/auth/register` - Registro de usuario
- [ ] POST `/api/v1/auth/refresh` - Refrescar token
- [ ] POST `/api/v1/auth/logout` - Cerrar sesión
- [ ] GET `/api/v1/auth/profile` - Obtener perfil
- [ ] PATCH `/api/v1/auth/profile` - Actualizar perfil
- [ ] POST `/api/v1/auth/change-password` - Cambiar contraseña

### Tests a Realizar
1. ✅ Login con credenciales válidas
2. ✅ Login con credenciales inválidas
3. ✅ Verificar token JWT en respuesta
4. ✅ Acceder a endpoint protegido con token
5. ✅ Acceder a endpoint protegido sin token (debe fallar)
6. ✅ Refresh token válido
7. ✅ Cambio de contraseña
8. ✅ Obtener perfil de usuario

---

## 2️⃣ GESTIÓN DE USUARIOS

### Backend Endpoints
- [ ] GET `/api/v1/users` - Listar usuarios
- [ ] GET `/api/v1/users/:id` - Obtener usuario por ID
- [ ] POST `/api/v1/users` - Crear usuario
- [ ] PATCH `/api/v1/users/:id` - Actualizar usuario
- [ ] DELETE `/api/v1/users/:id` - Eliminar usuario
- [ ] GET `/api/v1/users/agents` - Listar agentes
- [ ] PATCH `/api/v1/users/:id/status` - Cambiar estado

### Tests a Realizar
1. ✅ Crear usuario nuevo (agente)
2. ✅ Crear usuario con rol administrador
3. ✅ Listar todos los usuarios
4. ✅ Filtrar usuarios por rol
5. ✅ Actualizar información de usuario
6. ✅ Cambiar estado de usuario (active/inactive)
7. ✅ Eliminar usuario
8. ✅ Verificar permisos por rol

---

## 3️⃣ ROLES Y PERMISOS

### Backend Endpoints
- [ ] GET `/api/v1/roles` - Listar roles
- [ ] GET `/api/v1/roles/:id` - Obtener rol
- [ ] POST `/api/v1/roles` - Crear rol
- [ ] PATCH `/api/v1/roles/:id` - Actualizar rol
- [ ] GET `/api/v1/roles/:id/permissions` - Obtener permisos de rol

### Tests a Realizar
1. ✅ Listar todos los roles
2. ✅ Obtener permisos de cada rol
3. ✅ Verificar restricciones de acceso por rol
4. ✅ Super Admin tiene acceso a todo
5. ✅ Agente solo accede a sus chats

---

## 4️⃣ CAMPAÑAS

### Backend Endpoints
- [ ] GET `/api/v1/campaigns` - Listar campañas
- [ ] GET `/api/v1/campaigns/:id` - Obtener campaña
- [ ] POST `/api/v1/campaigns` - Crear campaña
- [ ] PATCH `/api/v1/campaigns/:id` - Actualizar campaña
- [ ] DELETE `/api/v1/campaigns/:id` - Eliminar campaña
- [ ] PATCH `/api/v1/campaigns/:id/status` - Cambiar estado

### Tests a Realizar
1. ✅ Crear campaña nueva
2. ✅ Asignar agentes a campaña
3. ✅ Configurar horarios de atención
4. ✅ Activar/desactivar campaña
5. ✅ Eliminar campaña
6. ✅ Verificar que solo usuarios de campaña vean sus chats

---

## 5️⃣ NÚMEROS DE WHATSAPP

### Backend Endpoints
- [ ] GET `/api/v1/whatsapp-numbers` - Listar números
- [ ] GET `/api/v1/whatsapp-numbers/:id` - Obtener número
- [ ] POST `/api/v1/whatsapp-numbers` - Crear número
- [ ] PATCH `/api/v1/whatsapp-numbers/:id` - Actualizar número
- [ ] DELETE `/api/v1/whatsapp-numbers/:id` - Eliminar número
- [ ] GET `/api/v1/whatsapp-numbers/:id/qr` - Obtener QR
- [ ] POST `/api/v1/whatsapp-numbers/:id/connect` - Conectar
- [ ] POST `/api/v1/whatsapp-numbers/:id/disconnect` - Desconectar

### Tests a Realizar
1. ✅ Agregar número de WhatsApp
2. ✅ Asignar número a campaña
3. ✅ Generar QR para conexión
4. ✅ Verificar estado de conexión
5. ✅ Desconectar número
6. ✅ Reconectar número
7. ✅ Eliminar número

---

## 6️⃣ CHATS Y MENSAJES

### Backend Endpoints
- [ ] GET `/api/v1/chats` - Listar chats
- [ ] GET `/api/v1/chats/:id` - Obtener chat
- [ ] PATCH `/api/v1/chats/:id` - Actualizar chat
- [ ] PATCH `/api/v1/chats/:id/assign` - Asignar chat
- [ ] PATCH `/api/v1/chats/:id/status` - Cambiar estado
- [ ] GET `/api/v1/messages` - Listar mensajes
- [ ] GET `/api/v1/messages/chat/:chatId` - Mensajes de chat
- [ ] POST `/api/v1/messages` - Enviar mensaje
- [ ] PATCH `/api/v1/messages/:id` - Actualizar mensaje

### Tests a Realizar
1. ✅ Crear chat desde WhatsApp (mensaje entrante)
2. ✅ Asignar chat a campaña correcta
3. ✅ Enviar mensaje desde CRM
4. ✅ Recibir mensaje en CRM
5. ✅ Enviar imagen/archivo
6. ✅ Asignar chat a agente
7. ✅ Cambiar estado del chat (open/pending/closed)
8. ✅ Transferir chat a otro agente
9. ✅ Verificar Socket.IO tiempo real
10. ✅ Marcar mensajes como leídos

---

## 7️⃣ BOT DE WHATSAPP

### Backend Endpoints
- [ ] GET `/api/v1/bot/flows` - Listar flujos
- [ ] GET `/api/v1/bot/flows/:id` - Obtener flujo
- [ ] POST `/api/v1/bot/flows` - Crear flujo
- [ ] PATCH `/api/v1/bot/flows/:id` - Actualizar flujo
- [ ] DELETE `/api/v1/bot/flows/:id` - Eliminar flujo
- [ ] GET `/api/v1/bot/flows/:id/nodes` - Obtener nodos
- [ ] POST `/api/v1/bot/flows/:id/nodes` - Crear nodo
- [ ] PATCH `/api/v1/bot/nodes/:id` - Actualizar nodo
- [ ] DELETE `/api/v1/bot/nodes/:id` - Eliminar nodo

### Tests a Realizar
1. ✅ Bot se activa con mensaje entrante
2. ✅ Bot detecta campaña correctamente
3. ✅ Bot ejecuta flujo asignado a campaña
4. ✅ Nodo MESSAGE envía texto
5. ✅ Nodo MENU presenta opciones
6. ✅ Nodo INPUT captura respuesta
7. ✅ Nodo CONDITION evalúa correctamente
8. ✅ Nodo TRANSFER_AGENT transfiere a agente
9. ✅ Variables se reemplazan {{variable}}
10. ✅ Bot maneja errores sin crashear
11. ✅ Sesión del bot persiste entre mensajes
12. ✅ Bot termina flujo correctamente
13. ✅ Chat se marca como "bot" cuando bot activo
14. ✅ Chat cambia a "open" al transferir a agente

---

## 8️⃣ DEUDORES

### Backend Endpoints
- [ ] GET `/api/v1/debtors` - Listar deudores
- [ ] GET `/api/v1/debtors/:id` - Obtener deudor
- [ ] POST `/api/v1/debtors` - Crear deudor
- [ ] PATCH `/api/v1/debtors/:id` - Actualizar deudor
- [ ] DELETE `/api/v1/debtors/:id` - Eliminar deudor
- [ ] POST `/api/v1/debtors/import` - Importar CSV

### Tests a Realizar
1. ✅ Crear deudor manualmente
2. ✅ Importar deudores desde CSV
3. ✅ Buscar deudor por documento
4. ✅ Buscar deudor por teléfono
5. ✅ Actualizar información de deudor
6. ✅ Bot obtiene datos de deudor
7. ✅ Variables de deudor en bot {{debtor.nombre}}

---

## 9️⃣ RESPUESTAS RÁPIDAS

### Backend Endpoints
- [ ] GET `/api/v1/quick-replies` - Listar respuestas
- [ ] GET `/api/v1/quick-replies/:id` - Obtener respuesta
- [ ] POST `/api/v1/quick-replies` - Crear respuesta
- [ ] PATCH `/api/v1/quick-replies/:id` - Actualizar respuesta
- [ ] DELETE `/api/v1/quick-replies/:id` - Eliminar respuesta
- [ ] GET `/api/v1/quick-replies/shortcut/:shortcut` - Buscar por atajo

### Tests a Realizar
1. ✅ Crear respuesta rápida
2. ✅ Usar respuesta rápida en chat
3. ✅ Buscar por shortcut (/hola)
4. ✅ Actualizar respuesta rápida
5. ✅ Eliminar respuesta rápida

---

## 🔟 MONITOREO Y REPORTES

### Backend Endpoints
- [ ] GET `/api/v1/monitoring/numbers/ranking` - Ranking de números
- [ ] GET `/api/v1/monitoring/numbers/:id/stats` - Estadísticas de número
- [ ] GET `/api/v1/monitoring/alerts/recent` - Alertas recientes
- [ ] GET `/api/v1/reports/dashboard` - Dashboard general
- [ ] GET `/api/v1/reports/agents` - Reporte de agentes
- [ ] GET `/api/v1/reports/campaigns` - Reporte de campañas

### Tests a Realizar
1. ✅ Visualizar estadísticas en tiempo real
2. ✅ Ranking de números funciona
3. ✅ Alertas se generan correctamente
4. ✅ Dashboard carga datos reales
5. ✅ Exportar reportes

---

## 1️⃣1️⃣ SOCKET.IO (TIEMPO REAL)

### Eventos
- [ ] `connection` - Conexión establecida
- [ ] `message.created` - Nuevo mensaje
- [ ] `message.updated` - Mensaje actualizado
- [ ] `chat.updated` - Chat actualizado
- [ ] `chat.assigned` - Chat asignado
- [ ] `whatsapp.message.received` - Mensaje WhatsApp entrante
- [ ] `agent.status.changed` - Estado de agente cambiado

### Tests a Realizar
1. ✅ Frontend recibe mensajes en tiempo real
2. ✅ Notificaciones de nuevos chats
3. ✅ Actualización de estado de chat
4. ✅ Múltiples usuarios conectados simultáneamente
5. ✅ Reconexión automática si se cae

---

## 1️⃣2️⃣ FRONTEND - VISTAS Y FLUJOS

### Login y Autenticación
1. ✅ Pantalla de login carga
2. ✅ Login exitoso redirecciona a dashboard
3. ✅ Token se guarda en localStorage
4. ✅ Logout limpia sesión
5. ✅ Redirección a login si no hay token

### Dashboard
1. ✅ Estadísticas se cargan
2. ✅ Gráficos se renderizan
3. ✅ Números actualizados en tiempo real

### Chats
1. ✅ Lista de chats carga
2. ✅ Filtros funcionan (pendiente, asignados, bot)
3. ✅ Búsqueda de chats
4. ✅ Abrir chat muestra mensajes
5. ✅ Enviar mensaje funciona
6. ✅ Enviar archivo funciona
7. ✅ Respuestas rápidas funcionan
8. ✅ Asignar chat a agente
9. ✅ Cerrar chat
10. ✅ Mensajes nuevos aparecen en tiempo real

### Bot Flows
1. ✅ Visualizar flujos
2. ✅ Crear flujo nuevo
3. ✅ Agregar nodos
4. ✅ Conectar nodos
5. ✅ Configurar nodo MESSAGE
6. ✅ Configurar nodo MENU
7. ✅ Configurar nodo CONDITION
8. ✅ Guardar flujo
9. ✅ Activar flujo en campaña

### Campañas
1. ✅ Listar campañas
2. ✅ Crear campaña
3. ✅ Asignar bot a campaña
4. ✅ Asignar número WhatsApp
5. ✅ Asignar agentes
6. ✅ Activar/desactivar campaña

### Usuarios
1. ✅ Listar usuarios
2. ✅ Crear usuario
3. ✅ Editar usuario
4. ✅ Cambiar rol
5. ✅ Desactivar usuario

### WhatsApp
1. ✅ Ver números conectados
2. ✅ Agregar número nuevo
3. ✅ Generar QR
4. ✅ Escanear QR desde móvil
5. ✅ Verificar conexión exitosa
6. ✅ Desconectar número

---

## 🔄 FLUJO COMPLETO E2E (End-to-End)

### Escenario 1: Nuevo Chat con Bot
1. ✅ Enviar mensaje WhatsApp desde móvil
2. ✅ Sistema crea chat automáticamente
3. ✅ Bot detecta campaña por número
4. ✅ Bot inicia flujo configurado
5. ✅ Bot envía primer mensaje
6. ✅ Usuario responde
7. ✅ Bot procesa respuesta
8. ✅ Bot continúa flujo
9. ✅ Bot transfiere a agente
10. ✅ Chat aparece en panel de agente
11. ✅ Agente recibe notificación
12. ✅ Agente responde
13. ✅ Usuario recibe respuesta en WhatsApp

### Escenario 2: Importación de Deudores y Campaña
1. ✅ Importar CSV de deudores
2. ✅ Verificar deudores en sistema
3. ✅ Crear campaña de cobranza
4. ✅ Asignar bot a campaña
5. ✅ Configurar flujo con datos de deudor
6. ✅ Deudor envía mensaje
7. ✅ Bot identifica deudor por teléfono
8. ✅ Bot muestra datos personalizados
9. ✅ Variables {{debtor.nombre}} funcionan
10. ✅ Flujo completo funciona

### Escenario 3: Multi-agente
1. ✅ Crear 3 agentes
2. ✅ Asignar a misma campaña
3. ✅ Recibir 3 mensajes diferentes
4. ✅ Chats se distribuyen entre agentes
5. ✅ Cada agente ve solo sus chats
6. ✅ Transferir chat entre agentes
7. ✅ Supervisor ve todos los chats

---

## 📝 CHECKLIST DE PRODUCCIÓN

- [ ] Backend responde en https://ngso-chat.assoftware.xyz/api/v1
- [ ] Frontend carga en https://172.203.16.202
- [ ] SSL certificado válido
- [ ] CORS configurado correctamente
- [ ] Base de datos PostgreSQL funcionando
- [ ] PM2 mantiene backend corriendo
- [ ] Nginx proxy funciona
- [ ] WhatsApp sessions persisten
- [ ] Backups automáticos configurados
- [ ] Logs accesibles
- [ ] Monitoreo de recursos (CPU, RAM)
- [ ] Manejo de errores sin crash

---

## 🚀 PRÓXIMOS PASOS

1. Ejecutar tests automatizados de backend
2. Hacer testing manual de frontend
3. Documentar errores encontrados
4. Corregir errores
5. Re-testear
6. Dar luz verde a producción

