# Testing de WhatsApp Flow - NGS&O CRM

Este documento explica cómo usar el script de testing para verificar el funcionamiento del flujo de WhatsApp.

## Requisitos

- Node.js instalado
- Backend y Frontend ejecutándose
- Al menos un número de WhatsApp conectado

## Instalación de dependencias

El script usa `axios` para hacer peticiones HTTP. Si no lo tienes instalado globalmente:

```powershell
cd backend
npm install axios
```

## Ejecución del script

### Diagnóstico completo

Este comando ejecuta todas las pruebas y muestra un resumen:

```powershell
cd backend
node test-whatsapp-flow.js
```

El script verificará:
1. ✅ Autenticación con el API
2. 📱 Sesiones de WhatsApp activas
3. 💬 Chats iniciados
4. 📨 Mensajes recibidos
5. 🤖 Flujo del bot

### Prueba en tiempo real

Para probar eventos en tiempo real:

```powershell
node test-whatsapp-flow.js --realtime
```

Este modo te pedirá que envíes un mensaje desde tu teléfono y luego verificará si se recibió correctamente.

## Interpretación de resultados

### ✅ Sesiones activas
```
✓ 1 sesión(es) de WhatsApp activa(s)
  1. Mi Línea de WhatsApp
     Número: +573001234567
     Estado: active
     Conectado: Sí
```

**Si no hay sesiones:**
- Ve a: WhatsApp Management → Conectar WhatsApp
- Escanea el código QR
- Espera a que se conecte

### ✅ Chats iniciados
```
✓ 5 chat(s) encontrado(s)
Chats por estado:
  active: 3
  waiting: 2
```

**Si no hay chats:**
- Envía un mensaje desde tu teléfono al número de WhatsApp conectado
- El sistema debe crear automáticamente un chat

### ✅ Mensajes recibidos
```
✓ 12 mensaje(s) encontrado(s)
Mensajes recibidos (inbound): 7
Mensajes enviados (outbound): 5
```

**Si no aparecen mensajes:**
1. Verifica que el evento `whatsapp.message.received` se esté emitiendo
2. Revisa los logs del backend
3. Confirma que `MessagesService` tiene el listener `@OnEvent('whatsapp.message.received')`

### ✅ Bot funcionando
```
✓ El bot está funcionando correctamente
Chats con bot activado: 3
Total de mensajes del bot: 8
```

**Si el bot no responde:**
1. Verifica que haya flujos de bot configurados en la base de datos
2. Confirma que el evento `message.created` se emite después de guardar el mensaje
3. Revisa los logs del `BotService`

## Notificaciones de sonido

### Frontend

Las notificaciones de sonido se activan automáticamente cuando:

1. **Llega un mensaje nuevo** del cliente
2. **Se asigna un chat** al agente

### Configuración

Ve a: **Configuración → Notificaciones**

Opciones disponibles:
- ✅ Habilitar/deshabilitar notificaciones
- 🔊 Ajustar volumen (0-100%)
- 🔔 Solicitar permisos del navegador
- 🧪 Probar notificación

### Solución de problemas

**No suena:**
1. Verifica que las notificaciones estén habilitadas en Configuración
2. Interactúa con la página (haz clic en cualquier parte) - Los navegadores bloquean audio automático
3. Verifica el volumen del sistema
4. Abre la consola del navegador (F12) y busca errores

**Archivo de sonido:**
- El sistema usa un beep generado por defecto
- Para usar un sonido personalizado:
  1. Descarga un MP3 de: https://notificationsounds.com/
  2. Guárdalo como: `frontend/public/sounds/notification.mp3`
  3. Recarga la página

## Diagnóstico avanzado

### Verificar eventos en tiempo real

1. Abre el frontend en el navegador
2. Abre DevTools (F12) → Consola
3. Deberías ver:
   ```
   ✅ Socket.IO conectado: abc123xyz
   ```

4. Envía un mensaje desde tu teléfono
5. Deberías ver en la consola:
   ```
   📡 Evento recibido: message:new {...}
   🔔 [Socket] Nuevo mensaje recibido - Reproduciendo notificación
   ```

### Verificar backend logs

En la terminal del backend, deberías ver:

```
[WhatsappService] Mensaje recibido: +573001234567
[MessagesService] Guardando mensaje en base de datos
[MessagesService] Emitiendo evento message.created
[BotService] Procesando mensaje para bot flow
[Gateway] Emitiendo evento message:new a sala agent-xyz
```

## Troubleshooting común

### Problema: "No se recibió token de autenticación"

**Solución:**
- Verifica que el backend esté corriendo en `http://localhost:3000`
- Confirma las credenciales por defecto:
  - Email: `admin@ngso.com`
  - Password: `Admin123!`

### Problema: "No hay sesiones activas"

**Solución:**
1. Ve a WhatsApp Management
2. Haz clic en "Conectar WhatsApp"
3. Escanea el código QR con tu teléfono
4. Espera a que el estado cambie a "Conectado"

### Problema: "Mensajes no aparecen"

**Causas posibles:**
1. El evento `whatsapp.message.received` no se emite (verifica WppConnectService)
2. El listener en MessagesService no está funcionando
3. Error en la base de datos

**Solución:**
```powershell
# Reinicia el backend
cd backend
npm run start:dev
```

Luego verifica los logs en busca de errores.

### Problema: "Bot no responde"

**Causas posibles:**
1. No hay flujos de bot configurados
2. El mensaje no cumple las condiciones del flujo
3. Error en BotService

**Solución:**
1. Verifica la tabla `bot_flows` en la base de datos
2. Confirma que el campo `isActive` sea `true`
3. Revisa las condiciones (triggers) del flujo

## Scripts útiles

### Verificar estado de la base de datos

```sql
-- Contar mensajes por chat
SELECT 
  c.client_phone,
  COUNT(m.id) as total_messages,
  MAX(m.created_at) as last_message
FROM chats c
LEFT JOIN messages m ON m.chat_id = c.id
GROUP BY c.id, c.client_phone
ORDER BY last_message DESC;

-- Verificar flujos de bot activos
SELECT id, name, is_active, trigger_type 
FROM bot_flows 
WHERE is_active = true;
```

### Limpiar datos de prueba

```sql
-- CUIDADO: Esto eliminará todos los chats y mensajes
DELETE FROM messages;
DELETE FROM chats WHERE client_phone LIKE '%test%';
```

## Contacto y soporte

Para reportar problemas o sugerencias:
- Desarrollador: Alejandro Sandoval - AS Software
- Proyecto: NGS&O CRM Gestión

---

**Última actualización:** 2025-01-21
