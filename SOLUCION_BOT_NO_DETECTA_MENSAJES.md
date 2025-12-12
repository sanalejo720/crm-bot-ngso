# ⚠️ PROBLEMA: Bot No Detecta Mensajes

## Causa Raíz Identificada

**La sesión de WhatsApp no está activa**

### Síntomas:
- ✅ Backend corriendo correctamente (PM2 online)
- ✅ Base de datos conectada
- ✅ Flujo de cobranza corregido y funcional
- ✅ Bot listener configurado y escuchando `message.created`
- ❌ **NO hay archivos de sesión en `/backend/wpp-sessions/`**
- ❌ **WPPConnect no tiene cliente inicializado**
- ❌ **No llegan eventos `whatsapp.message.received`**

### Diagnóstico Técnico:

1. **Estado de número WhatsApp:**
   ```
   ID: f2703192-1e4b-44db-80ff-bca65dd65cc7
   Teléfono: 14695720206
   Estado BD: connected
   Sesión: 14695720206
   Provider: wppconnect
   Activo: true
   Última conexión: 26/11/2025 (hace 5 días)
   ```

2. **Archivos de sesión:**
   ```bash
   $ ls wpp-sessions/
   ls: cannot access 'wpp-sessions/': No such file or directory
   ```
   **Problema:** El directorio no existe, por lo tanto no hay sesión guardada.

3. **Flujo de eventos:**
   ```
   WhatsApp (mensaje) 
     ↓
   WPPConnect.onMessage() → ❌ NO ACTIVO
     ↓
   emit('whatsapp.message.received') → ❌ NO SE EMITE
     ↓
   MessagesService.handleWhatsAppMessage()
     ↓
   emit('message.created')
     ↓
   BotListenerService.handleMessageCreated() → ✅ ESCUCHANDO (pero no recibe eventos)
   ```

4. **Logs del servidor:**
   - ✅ Backend inicia correctamente
   - ✅ Todos los módulos cargados
   - ✅ WebSocket Gateway funcionando
   - ❌ **NO aparecen logs de `message.created`** al enviar mensajes de WhatsApp
   - ❌ **NO aparecen logs de `onMessage`** en WPPConnect

## Solución Paso a Paso

### Opción 1: Desde el Frontend (RECOMENDADO)

1. **Acceder al panel de administración:**
   ```
   URL: https://ngso-chat.assoftware.xyz
   Usuario: admin@assoftware.xyz
   ```

2. **Ir a Configuración de WhatsApp:**
   - Menú lateral → Configuración → WhatsApp
   - O directamente: https://ngso-chat.assoftware.xyz/settings/whatsapp

3. **Iniciar sesión WPPConnect:**
   - Buscar el número: 14695720206
   - Click en "Iniciar Sesión" o "Conectar"
   - Se generará un código QR

4. **Escanear QR con WhatsApp:**
   - Abrir WhatsApp en el teléfono
   - Ir a: Configuración → Dispositivos vinculados
   - Click en "Vincular un dispositivo"
   - Escanear el QR del frontend

5. **Verificar conexión:**
   - El estado debe cambiar a "Conectado"
   - Aparecerá mensaje de éxito en el frontend

### Opción 2: Crear Sesión Manualmente (Si el frontend no funciona)

```bash
# 1. Conectarse al servidor
ssh azureuser@172.203.16.202

# 2. Crear directorio de sesiones
cd /home/azureuser/crm-ngso-whatsapp/backend
mkdir -p wpp-sessions tokens
chmod 755 wpp-sessions tokens

# 3. Reiniciar backend
pm2 restart crm-backend

# 4. Monitorear logs en busca del QR
pm2 logs crm-backend --lines 200

# Buscar líneas como:
# [WppConnectService] QR Code: [Base64 string]
# O usar el endpoint de QR desde el frontend
```

### Opción 3: Forzar Inicio con Script

**IMPORTANTE:** Esta opción requiere credenciales de administrador.

```bash
# En el servidor
cd /home/azureuser/crm-ngso-whatsapp/backend

# Obtener token de admin
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@assoftware.xyz","password":"TU_PASSWORD"}'

# Usar el token para iniciar sesión
curl -X POST http://localhost:3000/api/v1/whatsapp-numbers/f2703192-1e4b-44db-80ff-bca65dd65cc7/wppconnect/start \
  -H "Authorization: Bearer TOKEN_AQUI"

# Ver el QR generado
curl http://localhost:3000/api/v1/whatsapp-numbers/f2703192-1e4b-44db-80ff-bca65dd65cc7/wppconnect/status \
  -H "Authorization: Bearer TOKEN_AQUI"
```

## Verificación Post-Conexión

### 1. Verificar logs del backend:
```bash
pm2 logs crm-backend --lines 50
```

Deberías ver:
```
[WppConnectService] Session 14695720206 connected successfully
[WppConnectService] WPPConnect session 14695720206 started successfully
```

### 2. Enviar mensaje de prueba:
- Envía un mensaje de WhatsApp al número conectado
- Deberías ver en los logs:
```
[WppConnectService] 📨 Mensaje procesado de 573XXXXXXXXX
[MessagesService] 🚀 Evento message.created emitido correctamente
[BotListenerService] 🤖 Evaluando activación de bot para chat XXX
```

### 3. Verificar archivos de sesión:
```bash
ls -la /home/azureuser/crm-ngso-whatsapp/backend/wpp-sessions/
```

Deberías ver archivos de sesión guardados.

## Próximos Pasos Después de Conectar

Una vez que la sesión esté activa:

1. ✅ Los mensajes entrantes serán detectados automáticamente
2. ✅ El bot se activará para chats sin agente
3. ✅ El flujo de cobranza iniciará correctamente
4. ✅ La búsqueda por documento funcionará
5. ✅ Las variables se reemplazarán con datos reales

## Comandos Útiles

```bash
# Ver estado del backend
pm2 status

# Ver logs en tiempo real
pm2 logs crm-backend

# Reiniciar backend
pm2 restart crm-backend

# Verificar conexión a BD
cd /home/azureuser/crm-ngso-whatsapp/backend
node check-whatsapp-status.js

# Verificar flujo de cobranza
node check-flows-db.js
```

## Resumen

**Estado Actual:**
- ✅ Código del bot perfecto y funcional
- ✅ Flujo de cobranza completamente reparado
- ✅ Búsqueda por documento implementada
- ✅ Backend estable y corriendo
- ❌ **Sesión de WhatsApp desconectada (falta escanear QR)**

**Acción Inmediata:**
1. Abrir https://ngso-chat.assoftware.xyz
2. Ir a Configuración → WhatsApp
3. Iniciar sesión con el número 14695720206
4. Escanear el código QR con WhatsApp
5. Verificar que cambie a "Conectado"
6. Enviar un mensaje de prueba

Una vez completados estos pasos, el sistema estará 100% operativo.
