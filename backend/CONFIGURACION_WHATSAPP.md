# Configuración de WhatsApp

El sistema soporta dos proveedores de WhatsApp:

## Opción 1: Meta Cloud API (Recomendado para Producción)

### Requisitos:
1. Cuenta de Meta Business
2. Aplicación de Facebook configurada
3. Número de WhatsApp Business verificado

### Pasos:

1. **Obtener credenciales:**
   - Ve a https://developers.facebook.com/
   - Crea una aplicación o usa una existente
   - Agrega el producto "WhatsApp"
   - Obtén el `PHONE_NUMBER_ID` y `ACCESS_TOKEN`
   - Configura el webhook en Meta apuntando a: `https://tu-dominio.com/api/v1/webhooks/whatsapp/meta`
   - Token de verificación: configurar en `.env` como `META_WEBHOOK_VERIFY_TOKEN`

2. **Configurar en el sistema:**
   ```bash
   # Actualizar .env
   META_CLOUD_API_URL=https://graph.facebook.com/v18.0
   META_WEBHOOK_VERIFY_TOKEN=tu_token_secreto_123
   ```

3. **Registrar número en la base de datos:**
   ```sql
   INSERT INTO whatsapp_numbers (
       id, "phoneNumber", "displayName", provider, status,
       "phoneNumberId", "accessToken", "isActive", "campaignId",
       "createdAt", "updatedAt"
   ) VALUES (
       gen_random_uuid(),
       '573001234567',  -- Tu número con código de país
       'Soporte Principal',
       'meta',
       'connected',
       'TU_PHONE_NUMBER_ID',  -- De Meta Business
       'TU_ACCESS_TOKEN',     -- De Meta Business
       true,
       (SELECT id FROM campaigns WHERE name = 'Campaña Demo 2025'),
       NOW(),
       NOW()
   );
   ```

4. **Verificar webhook:**
   - Meta enviará una petición GET a tu webhook
   - El sistema responderá automáticamente con el challenge

### Limitaciones Meta Cloud API:
- Requiere dominio público con HTTPS
- Necesita verificación de negocio para volúmenes altos
- Costo por conversación (gratuito hasta cierto límite)

---

## Opción 2: WPPConnect (Recomendado para Testing/Dev)

### Ventajas:
- ✅ No requiere cuenta de Meta Business
- ✅ Funciona con WhatsApp Web
- ✅ Gratis y sin límites
- ✅ Ideal para desarrollo local

### Pasos:

1. **Registrar número en la base de datos:**
   ```sql
   INSERT INTO whatsapp_numbers (
       id, "phoneNumber", "displayName", provider, status,
       "sessionName", "isActive", "campaignId",
       "createdAt", "updatedAt"
   ) VALUES (
       gen_random_uuid(),
       '573001234567',  -- Tu número con código de país
       'WhatsApp Testing',
       'wppconnect',
       'disconnected',
       'session_test_01',  -- Nombre único de sesión
       true,
       (SELECT id FROM campaigns WHERE name = 'Campaña Demo 2025'),
       NOW(),
       NOW()
   );
   ```

2. **Iniciar sesión desde el API:**
   ```bash
   # Obtener el ID del número creado
   curl -X GET "http://localhost:3000/api/v1/whatsapp-numbers" \
     -H "Authorization: Bearer TU_TOKEN"
   
   # Iniciar sesión (generará QR code)
   curl -X POST "http://localhost:3000/api/v1/whatsapp-numbers/{id}/wppconnect/start" \
     -H "Authorization: Bearer TU_TOKEN"
   ```

3. **Escanear QR code:**
   - El QR se guardará en `backend/tokens/{sessionName}.qr.png`
   - Abre la imagen y escanéala con tu WhatsApp
   - La sesión quedará conectada automáticamente

4. **Verificar estado:**
   ```bash
   curl -X GET "http://localhost:3000/api/v1/whatsapp-numbers/{id}/wppconnect/status" \
     -H "Authorization: Bearer TU_TOKEN"
   ```

### Carpetas WPPConnect:
```
backend/
  tokens/          # QR codes y datos de sesión
  {session}/       # Archivos de sesión de WhatsApp Web
```

---

## Pruebas Rápidas

### Enviar mensaje de prueba:
```bash
# Con cualquier proveedor (el sistema detecta automáticamente)
curl -X POST "http://localhost:3000/api/v1/messages/send" \
  -H "Authorization: Bearer TU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "whatsappNumberId": "ID_DEL_NUMERO",
    "to": "573001234567",
    "content": "Hola, este es un mensaje de prueba",
    "type": "text"
  }'
```

### Simular mensaje entrante (solo testing):
```bash
# Esto creará un chat y mensaje como si llegara de WhatsApp
curl -X POST "http://localhost:3000/api/v1/chats" \
  -H "Authorization: Bearer TU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "externalId": "5730012345678@c.us",
    "contactPhone": "573001234567",
    "contactName": "Cliente Test",
    "campaignId": "ID_CAMPANA",
    "whatsappNumberId": "ID_NUMERO_WHATSAPP"
  }'
```

---

## Estado Actual del Sistema

✅ **Backend funcionando:**
- API: http://localhost:3000/api/v1
- Swagger: http://localhost:3000/api/docs
- WebSocket: ws://localhost:3000

✅ **Base de datos:**
- PostgreSQL: localhost:5432
- pgAdmin: http://localhost:5050 (admin@crm.com / admin123)
- Redis: localhost:6379

✅ **Datos de prueba:**
- 1 Administrador: admin@crm.com / Admin123!
- 6 Agentes creados
- 1 Campaña: "Campaña Demo 2025"
- 5 Roles con permisos configurados

---

## Próximos Pasos

1. **Configurar WhatsApp** (este documento)
2. **Probar envío/recepción de mensajes**
3. **Crear flujo de bot**
4. **Probar asignación automática de chats**
5. **Probar WebSocket (eventos en tiempo real)**
6. **Comenzar frontend React**

---

## Troubleshooting

### WPPConnect no genera QR:
- Verificar que la carpeta `backend/tokens` exista
- Revisar logs del backend
- Reintentar la sesión

### Meta webhook no funciona:
- Verificar que el dominio sea HTTPS
- Confirmar que el token de verificación coincida
- Revisar logs de Meta Developer Console

### Mensajes no se envían:
- Verificar estado del número: debe ser "connected"
- Confirmar que el token/credenciales sean válidos
- Revisar tabla `messages` para ver errores

### Chat no se asigna:
- Verificar que haya agentes disponibles (agentState = 'available')
- Confirmar que los agentes tengan maxConcurrentChats > 0
- Revisar configuración de routing en la campaña
