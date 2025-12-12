# 🚀 Guía de Configuración Twilio WhatsApp

## 📋 Credenciales que Necesitas

Entra a tu cuenta de Twilio: https://console.twilio.com/

### 1. Account SID y Auth Token
En el Dashboard principal encontrarás:
- **Account SID**: `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` (34 caracteres)
- **Auth Token**: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` (32 caracteres)

### 2. Número de WhatsApp
Ve a: **Messaging → Try it out → Send a WhatsApp message**

Encontrarás tu número de prueba en formato:
- **whatsapp:+14155238886** (número de ejemplo de Twilio)

## 🔧 Configuración en el CRM

### Opción A: Desde la Interfaz Web ⭐ RECOMENDADO

1. Ve a: https://chat-ngso.assoftware.cloud
2. Inicia sesión como Super Admin
3. Ve a **Configuración → Números de WhatsApp** (o `/whatsapp-numbers`)
4. Clic en **"+ Agregar Número"**
5. Completa el formulario:
   - **Nombre Descriptivo**: `WhatsApp Twilio Prueba`
   - **Número de Teléfono**: `14155238886` (sin el +)
   - **Proveedor**: Selecciona `Twilio WhatsApp`
   
6. Al seleccionar Twilio, aparecerán automáticamente 3 campos:
   - **Account SID**: `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - **Auth Token**: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - **Twilio Phone Number**: `whatsapp:+14155238886`
   
7. **Campaña**: Selecciona tu campaña (opcional)
8. Clic en **"Crear"**

✅ El sistema automáticamente configura y activa el número. No necesitas QR ni pasos adicionales.

### Opción B: Script SQL Directo

Ejecuta en tu base de datos `crm_whatsapp`:

```sql
INSERT INTO public.whatsapp_numbers (
  id,
  "phoneNumber",
  "displayName",
  provider,
  status,
  "twilioAccountSid",
  "twilioAuthToken",
  "twilioPhoneNumber",
  "isActive",
  "campaignId",
  "createdAt",
  "updatedAt"
)
VALUES (
  gen_random_uuid(),
  '+14155238886', -- Tu número de Twilio (sin whatsapp:)
  'WhatsApp Twilio Prueba',
  'twilio',
  'connected', -- Twilio no requiere QR, está siempre conectado
  'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', -- Tu Account SID
  'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', -- Tu Auth Token
  'whatsapp:+14155238886', -- Tu número con prefijo whatsapp:
  true,
  'TU_CAMPAIGN_ID', -- ID de tu campaña existente
  NOW(),
  NOW()
);
```

## 📞 Configurar Webhook en Twilio

Para recibir mensajes entrantes:

1. Ve a: https://console.twilio.com/us1/develop/sms/settings/whatsapp-sandbox
2. En **"When a message comes in"**:
   - URL: `https://chat-ngso.assoftware.cloud/webhooks/whatsapp/twilio`
   - Método: **POST**
3. Guardar

## ✅ Prueba de Envío

### Desde tu WhatsApp personal:

1. **Envía un mensaje al Sandbox de Twilio**:
   - Abre WhatsApp
   - Agrega el número: `+1 415 523 8886`
   - Envía el mensaje: `join <tu-codigo-sandbox>`
     (El código aparece en: https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn)

2. **Prueba desde el CRM**:
   - Ve a un chat existente
   - Envía un mensaje de prueba
   - Deberías recibirlo en tu WhatsApp

## 🔍 Verificar que Funciona

### Logs del Backend:
```bash
ssh root@72.61.73.9 "pm2 logs crm-backend --lines 50"
```

Busca:
```
📤 Enviando via Twilio - WhatsApp ID: xxx
📱 From: whatsapp:+14155238886, To: whatsapp:+573001234567
Mensaje enviado vía Twilio: SM...
```

### Test de Conexión

Ejecuta desde tu backend local:

```javascript
// test-twilio.js
const twilio = require('twilio');

const accountSid = 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'; // Tu Account SID
const authToken = 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';   // Tu Auth Token
const client = twilio(accountSid, authToken);

client.messages
  .create({
    from: 'whatsapp:+14155238886',  // Tu número de Twilio
    to: 'whatsapp:+573001234567',    // Tu WhatsApp personal
    body: '✅ Prueba exitosa desde CRM NGSO'
  })
  .then(message => console.log('✅ Mensaje enviado:', message.sid))
  .catch(error => console.error('❌ Error:', error));
```

Ejecutar:
```bash
node test-twilio.js
```

## 📊 Limitaciones del Sandbox (Cuenta de Prueba)

- **Solo números autorizados**: Debes enviar `join` primero desde cada número
- **Límite**: ~200 mensajes/día
- **Prefijo obligatorio**: Tus mensajes llevarán "Sent from your Twilio trial account -"
- **Válido 3 días**: Después de 3 días sin usar, debes reenviar `join`

## 🚀 Cuenta de Producción

Para quitar limitaciones:

1. **Verifica tu cuenta**: https://console.twilio.com/billing
2. **Upgrade a Pay-As-You-Go**: Agrega tarjeta de crédito
3. **Solicita tu número**: https://console.twilio.com/phone-numbers
4. **Costos en Colombia**:
   - Mensajes entrantes: $0.005 USD c/u
   - Mensajes salientes: $0.01 USD c/u
   - Sin límite de mensajes/día

## ⚠️ Problemas Comunes

### "Unable to create record: Invalid 'To' Phone Number"
**Solución**: El número destino debe haber enviado `join` al sandbox primero.

### "Authentication Error"
**Solución**: Verifica que Account SID y Auth Token sean correctos.

### "From number not in Twilio account"
**Solución**: Asegúrate de usar `whatsapp:+14155238886` (con prefijo).

### No recibo mensajes entrantes
**Solución**: Verifica la configuración del webhook en Twilio.

## 📞 Soporte

- Documentación Twilio: https://www.twilio.com/docs/whatsapp
- Console Twilio: https://console.twilio.com
- Logs del sistema: `pm2 logs crm-backend`

---

**¿Todo funcionando?** 
Prueba transferir un chat al bot y verifica que se genere el PDF automático! 🎉
