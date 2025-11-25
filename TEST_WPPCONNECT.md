# 📱 Guía de Prueba - WPPConnect QR Scanner

## ✅ Estado del Sistema

### Backend
- ✅ Corriendo en: http://localhost:3000
- ✅ API Swagger: http://localhost:3000/api/docs
- ✅ Socket.IO escuchando eventos de WhatsApp
- ✅ WPPConnect instalado: v1.37.6

### Frontend
- ✅ Corriendo en: http://localhost:5174
- ✅ Socket.IO configurado con reconexión automática
- ✅ Logging detallado habilitado

---

## 🧪 Pasos para Probar la Conexión Real

### 1. Acceder al Sistema
```
URL Frontend: http://localhost:5174
Usuario: admin@crm.com (o tu usuario con rol Supervisor/Admin)
Contraseña: password123
```

### 2. Navegar a WhatsApp Management
```
Menú lateral → WhatsApp
o directamente: http://localhost:5174/whatsapp
```

### 3. Crear un Nuevo Número WhatsApp

**Paso 3.1:** Hacer clic en el botón **"+ Agregar Número"**

**Paso 3.2:** Completar el formulario:
- **Número de teléfono**: `573001234567` (número de prueba)
- **Nombre/Alias**: `Línea de Prueba`
- **Proveedor**: Seleccionar **WPPConnect**
- **Campaña**: (Opcional) Seleccionar una campaña existente

**Paso 3.3:** Hacer clic en **"Crear"**

### 4. Generar y Escanear QR Code

**Paso 4.1:** En la tabla de números, buscar el número recién creado

**Paso 4.2:** Hacer clic en el icono de **QR Code** (📱)

**Paso 4.3:** Se abrirá un modal con el QR Code:
- El QR se genera automáticamente
- Si no aparece inmediatamente, esperar 5-10 segundos
- El QR debe mostrarse como una imagen Base64

**Paso 4.4:** **ESCANEAR CON TU WHATSAPP REAL:**

**En Android:**
1. Abrir WhatsApp
2. Tocar los 3 puntos (⋮) → Dispositivos vinculados
3. Tocar "Vincular un dispositivo"
4. Escanear el QR en la pantalla

**En iPhone:**
1. Abrir WhatsApp
2. Ir a Ajustes → Dispositivos vinculados
3. Tocar "Vincular un dispositivo"
4. Escanear el QR en la pantalla

### 5. Verificar Conexión Exitosa

**Paso 5.1:** Observar la consola del navegador (F12):
```javascript
✅ Socket conectado para WhatsApp Management (ID: ...)
📱 QR Code recibido: { numberId: "...", qrLength: ... }
📊 Estado de sesión actualizado: { sessionName: "573001234567", status: "qrReadSuccess" }
✅ WhatsApp conectado exitosamente: { numberId: "...", sessionName: "..." }
```

**Paso 5.2:** El modal del QR debe cerrarse automáticamente

**Paso 5.3:** Debe aparecer una alerta: **"¡WhatsApp conectado exitosamente!"**

**Paso 5.4:** En la tabla, el estado del número debe cambiar a:
- Chip **verde** con texto **"Conectado"**

---

## 🔍 Logs en el Backend

Observar en la terminal del backend:

```
[Nest] LOG [WppConnectService] QR Code generated for session 573001234567
[Nest] LOG [WppConnectService] Session 573001234567 status: qrReadSuccess
[Nest] LOG [EventsGateway] Evento whatsapp.qrcode.generated: ...
[Nest] LOG [EventsGateway] Evento whatsapp.session.status: 573001234567 -> qrReadSuccess
[Nest] LOG [EventsGateway] Evento whatsapp.session.status: 573001234567 -> isLogged
[Nest] LOG [WhatsappNumbersService] WhatsApp session connected: ...
```

---

## 🐛 Troubleshooting

### El QR no aparece
**Problema:** Modal abierto pero sin QR Code

**Soluciones:**
1. Verificar consola del navegador (F12) para errores
2. Verificar que el backend esté corriendo (`http://localhost:3000`)
3. Verificar Socket.IO en la consola: debe decir "Socket conectado"
4. Cerrar modal y volver a abrir

### El QR no se puede escanear
**Problema:** WhatsApp dice "Código QR inválido"

**Soluciones:**
1. El QR tiene un timeout de 60 segundos - regenerar si pasó mucho tiempo
2. Cerrar el modal y generar uno nuevo
3. Verificar que el número no esté ya conectado en otro dispositivo

### La conexión se pierde
**Problema:** Estado cambia a "Desconectado" después de conectar

**Soluciones:**
1. Verificar que WhatsApp no se haya cerrado en el teléfono
2. Verificar logs del backend para errores
3. Intentar reconectar desde el botón de QR

### Socket.IO no se conecta
**Problema:** Consola muestra "Error de conexión Socket.IO"

**Soluciones:**
1. Verificar que el backend esté corriendo
2. Verificar que el token de autenticación sea válido (reloguear)
3. Verificar CORS en el backend (debe permitir localhost:5174)

---

## 📊 Estados Posibles del Número

| Estado | Color | Descripción |
|--------|-------|-------------|
| `disconnected` | Gris | Sin conexión activa |
| `qr_waiting` | Amarillo | Esperando escaneo del QR |
| `connected` | Verde | Conectado y funcionando |
| `error` | Rojo | Error en la conexión |
| `connecting` | Azul | Conectando... |

---

## 🎯 Próximos Pasos Después de Conectar

1. **Probar envío de mensajes:**
   - Navegar a Chats
   - Crear o abrir un chat
   - Enviar un mensaje de prueba

2. **Verificar recepción de mensajes:**
   - Enviar un mensaje desde otro WhatsApp al número conectado
   - Debe aparecer en tiempo real en el sistema

3. **Probar Quick Replies (Plantillas):**
   - Navegar a Templates
   - Crear una plantilla de respuesta rápida
   - Usarla en una conversación

---

## 🔐 Información Técnica

### Endpoints Utilizados
```
POST /api/v1/whatsapp-numbers - Crear número
POST /api/v1/whatsapp-numbers/:id/wppconnect/start - Generar QR
GET  /api/v1/whatsapp-numbers/:id/wppconnect/status - Ver estado
POST /api/v1/whatsapp-numbers/:id/wppconnect/disconnect - Desconectar
```

### Eventos Socket.IO
```javascript
// Cliente → Servidor
socket.emit('connect', { token })

// Servidor → Cliente
socket.on('whatsapp.qrcode.generated', { numberId, qrCode })
socket.on('whatsapp.session.status', { sessionName, status })
socket.on('whatsapp.session.connected', { numberId, sessionName })
socket.on('whatsapp.session.disconnected', { numberId })
```

### Estructura de Datos
```typescript
interface WhatsAppNumber {
  id: string;
  phoneNumber: string;
  displayName: string;
  provider: 'wppconnect' | 'meta';
  status: 'connected' | 'disconnected' | 'qr_waiting' | 'error' | 'connecting';
  sessionName: string;
  campaignId?: string;
  isActive: boolean;
}
```

---

## ✅ Checklist de Prueba Completa

- [ ] Backend corriendo en puerto 3000
- [ ] Frontend corriendo en puerto 5174
- [ ] Login exitoso en el sistema
- [ ] Navegación a /whatsapp funciona
- [ ] Crear número WhatsApp exitoso
- [ ] Modal de QR se abre correctamente
- [ ] QR Code se genera y muestra
- [ ] Socket.IO conectado (verificar consola)
- [ ] Escaneo del QR desde WhatsApp móvil
- [ ] Conexión exitosa confirmada
- [ ] Estado actualizado a "Conectado"
- [ ] Alert de confirmación aparece
- [ ] Logs del backend muestran eventos correctos

---

## 📞 Soporte

Si encuentras algún error:

1. Capturar logs de la consola del navegador (F12 → Console)
2. Capturar logs del terminal del backend
3. Capturar screenshot del error
4. Documentar pasos exactos para reproducir

---

**Sistema:** NGS&O CRM Gestión - WhatsApp Module
**Desarrollado por:** AS Software
**Versión:** 1.0.0
**Fecha:** Noviembre 2025
