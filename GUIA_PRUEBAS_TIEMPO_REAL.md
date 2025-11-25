# 🧪 Guía de Pruebas - Sistema de Mensajes en Tiempo Real

## 🔧 Problemas Solucionados (24/Nov/2025)

### 1. ❌ **Los mensajes no se enviaban por WhatsApp**
- **Síntoma**: Al escribir en el frontend, los mensajes no llegaban a WhatsApp
- **Causa**: Frontend llamaba a `/messages` (crear mensaje interno) en vez de `/messages/send`
- **Solución**: Cambiado endpoint en `messagesSlice.ts` → `/messages/send`
- **Archivo**: `frontend/src/store/slices/messagesSlice.ts`

### 2. ❌ **Los mensajes recibidos no se mostraban automáticamente**
- **Síntoma**: Sonaba notificación pero había que refrescar para ver mensajes
- **Causa**: Frontend no se unía al room del chat (`chat:{chatId}`)
- **Solución**: 
  - Agregado `joinChatRoom()` y `leaveChatRoom()` al socket service
  - `ChatMessages.tsx` ahora se suscribe al room cuando se abre un chat
- **Archivos modificados**:
  - `frontend/src/services/socket.service.ts`
  - `frontend/src/components/chat/ChatMessages.tsx`

### 3. ❌ **Los mensajes no mostraban hora de Colombia**
- **Síntoma**: Las horas de los mensajes no coincidían con la zona horaria local
- **Causa**: El frontend usaba la zona horaria del navegador/sistema
- **Solución**: Configuradas todas las funciones de formateo para usar zona horaria `America/Bogota` (UTC-5)
- **Funciones actualizadas**:
  - `formatTimeOnly()` - Hora en formato 24h (HH:mm)
  - `formatDate()` - Fecha completa con hora
  - `formatDateOnly()` - Solo fecha (dd/MM/yyyy)
  - `formatRelativeDate()` - "Hace X tiempo"
- **Archivo**: `frontend/src/utils/helpers.ts`

### 4. ❌ **Bot no se activaba con mensajes entrantes**
- **Síntoma**: Al recibir mensajes de WhatsApp, el bot no respondía automáticamente
- **Causa**: El evento `message.created` se emitía con formato incorrecto
- **Solución**: 
  - Cambiado formato del evento de `message` a `{ message, chat }`
  - Actualizados todos los listeners del evento
- **Archivos modificados**:
  - `backend/src/modules/messages/messages.service.ts`
  - `backend/src/modules/gateway/events.gateway.ts`
  - `backend/src/modules/audit/audit.service.ts`

### 5. ✅ **Resultado Final**
- ✅ Mensajes se envían correctamente por WhatsApp
- ✅ Mensajes entrantes aparecen automáticamente en tiempo real
- ✅ Contador de "no leídos" se actualiza automáticamente
- ✅ Hora mostrada en zona horaria de Colombia (UTC-5)
- ✅ Bot se activa correctamente con mensajes entrantes
- ✅ No hay duplicados (el sistema detecta IDs repetidos)
- ✅ Notificaciones sonoras funcionan

---

## 📋 Pre-requisitos

1. **Backend corriendo**: El servidor backend debe estar activo en `http://localhost:3000`
2. **Frontend compilado**: Los archivos del frontend deben estar compilados (dist/)
3. **Base de datos**: PostgreSQL debe estar corriendo con los datos del CRM
4. **WhatsApp configurado**: Al menos un número de WhatsApp conectado

## 🚀 Pasos para Verificar el Sistema

### Paso 1: Iniciar el Backend

```powershell
cd D:\crm-ngso-whatsapp\backend
npm run start:dev
```

**Verificar que veas**:
- ✅ "Nest application successfully started"
- ✅ "Application is running on: http://localhost:3000/api/v1"
- ✅ Sin errores de conexión a base de datos

### Paso 2: Abrir el Frontend

1. Abre tu navegador (Chrome o Edge recomendado)
2. Ve a la URL donde está desplegado el frontend
3. **Abre las herramientas de desarrollador** (F12)
4. Ve a la pestaña **Console**

### Paso 3: Iniciar Sesión en el CRM

1. Ingresa con tus credenciales:
   - Email: `admin@crm.com`
   - Password: `password123`

2. **Verifica en la consola del navegador** que veas:
   ```
   ✅ [Socket] WebSocket conectado! Socket ID: ...
   ✅ [Socket] Respuesta de agent:join: {success: true, room: 'user:...'}
   ```

   Si NO ves estos mensajes, hay un problema de conexión WebSocket.

### Paso 4: Abrir un Chat

1. En el CRM, ve a la sección de "Chats"
2. Selecciona cualquier chat activo
3. **Verifica en la consola** que veas:
   ```
   🔌 [ChatMessages] Subscribing to messages for chat: ...
   ```

### Paso 5: Prueba de Envío de Mensaje

**Desde el Panel del CRM:**

1. Escribe un mensaje en la caja de texto
2. Presiona Enter o haz clic en "Enviar"

**Lo que deberías ver en la consola del navegador**:
```
📡 Evento recibido: message:new
📨 [Socket] Evento message:new recibido: {...}
📨 [Socket] Mensaje normalizado: {...}
✅ [Socket] Llamando handler con chatId: ...
📨 [ChatMessages] Received event: {...}
🆔 [ChatMessages] Current chat: ... Event chat: ...
✅ [ChatMessages] Dispatching addMessage for message: ...
```

**Lo que deberías ver en el backend (terminal)**:
```
📤 [Message] Created: ... in chat ...
📡 [Message] Emitting event with chat.assignedAgentId: ...
🔊 [Gateway] Broadcasting to chat:...
🔊 [Gateway] Broadcasting to user:...
```

**Resultado esperado**:
- ✅ El mensaje aparece INMEDIATAMENTE en la UI sin refrescar
- ✅ El mensaje aparece en la lista de mensajes
- ✅ El scroll se mueve automáticamente al último mensaje

### Paso 6: Prueba de Recepción de Mensaje

**Desde WhatsApp (teléfono celular)**:

1. Envía un mensaje al número de WhatsApp del CRM desde el número del chat que tienes abierto

**Lo que deberías ver en la consola del navegador**:
```
📡 Evento recibido: message:new
📨 [Socket] Evento message:new recibido: {...}
🔔 [Socket] Nuevo mensaje recibido - Reproduciendo notificación
✅ [Socket] Llamando handler con chatId: ...
📨 [ChatMessages] Received event: {...}
✅ [ChatMessages] Dispatching addMessage for message: ...
```

**Resultado esperado**:
- ✅ El mensaje aparece INMEDIATAMENTE en la UI sin refrescar
- ✅ Suena la notificación de audio
- ✅ El mensaje aparece en el lado correcto (del cliente)
- ✅ El contador de mensajes no leídos se actualiza

### Paso 7: Ejecutar Script de Prueba Automatizado

```powershell
cd D:\crm-ngso-whatsapp\backend
node test-realtime-messages.js
```

**Este script verificará**:
- ✅ Autenticación
- ✅ Conexión WebSocket
- ✅ Unión al room del agente
- ✅ Envío de mensaje
- ✅ Recepción de eventos en tiempo real
- ✅ Mensajes guardados en base de datos

## 🔍 Diagnóstico de Problemas

### Problema 1: "WebSocket no conecta"

**Síntomas**:
- No ves mensajes de `[Socket]` en la consola
- Los mensajes no aparecen en tiempo real

**Solución**:
1. Verifica que el backend esté corriendo
2. Verifica que no haya errores de CORS
3. Comprueba que el puerto 3000 esté accesible
4. Revisa los logs del backend para errores de Socket.IO

### Problema 2: "Mensajes no aparecen en tiempo real"

**Síntomas**:
- Los eventos WebSocket llegan (los ves en consola)
- Pero la UI no se actualiza

**Solución**:
1. Verifica que el `chatId` del evento coincida con el chat abierto
2. Comprueba que Redux esté despachando la acción `addMessage`
3. Abre React DevTools y verifica que el componente ChatMessages se re-renderice

### Problema 3: "El bot muestra valores 'null'"

**Síntomas**:
- Los mensajes del bot dicen "null días de mora" o "deuda de $null"

**Esto ya está corregido** en los últimos cambios:
- ✅ `bot-listener.service.ts` ahora pasa las variables del deudor al flujo
- ✅ `bot-engine.service.ts` ahora acepta variables iniciales
-
 ✅ Los valores de deuda y días de mora se cargan desde la base de datos de deudores

### Problema 4: "Error en bot-listener"

**Síntomas**:
```
ERROR [Event] Cannot read properties of undefined (reading 'direction')
```

**Esto ya está corregido**:
- ✅ El `bot-listener` ahora extrae el chat correctamente del mensaje
- ✅ Se valida que el chat exista antes de procesar

## 📊 Checklist de Verificación

- [ ] Backend corriendo sin errores
- [ ] Frontend compilado y accesible
- [ ] Login exitoso en el CRM
- [ ] WebSocket conectado (ver consola del navegador)
- [ ] Agent join exitoso (ver "Respuesta de agent:join")
- [ ] Chat abierto y suscrito
- [ ] Mensaje enviado desde panel aparece en tiempo real
- [ ] Mensaje recibido desde WhatsApp aparece en tiempo real
- [ ] Notificación de audio funciona
- [ ] Bot responde con valores correctos (no "null")
- [ ] Script de prueba automatizado pasa todas las verificaciones

## 🎯 Resultado Esperado Final

Al completar todas las pruebas, deberías tener:

1. ✅ **Mensajes en tiempo real**: Los mensajes aparecen instantáneamente sin refrescar la página
2. ✅ **Notificaciones**: Suena un audio cuando llegan mensajes nuevos
3. ✅ **Bot funcional**: El bot responde automáticamente con los datos correctos del deudor
4. ✅ **WebSocket estable**: La conexión se mantiene activa y reconecta automáticamente
5. ✅ **UI responsiva**: La interfaz se actualiza inmediatamente con cada acción

## 📝 Reportar Problemas

Si encuentras algún problema que no aparece en esta guía:

1. Copia los mensajes de error de la consola del navegador
2. Copia los logs relevantes del backend
3. Describe los pasos exactos para reproducir el problema
4. Incluye capturas de pantalla si es posible

## 🔧 Comandos Útiles

```powershell
# Reiniciar backend
cd D:\crm-ngso-whatsapp\backend
# Ctrl+C para detener, luego:
npm run start:dev

# Recompilar frontend
cd D:\crm-ngso-whatsapp\frontend
npm run build

# Ver logs en tiempo real del backend
# (Los logs ya aparecen en la terminal donde corre el servidor)

# Verificar salud del backend
curl http://localhost:3000/api/v1/health -UseBasicParsing

# Ejecutar prueba automatizada
cd D:\crm-ngso-whatsapp\backend
node test-realtime-messages.js
```

---

**Última actualización**: 24 de noviembre de 2025
**Desarrollado por**: AS Software
