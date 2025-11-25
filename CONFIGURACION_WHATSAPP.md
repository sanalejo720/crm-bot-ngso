# Guía de Configuración de WhatsApp - NGS&O CRM Gestión

## 📋 Índice
1. [Configuración WPPConnect (QR Local)](#wppconnect)
2. [Configuración Meta Cloud API](#meta-cloud-api)
3. [Asignación de Números a Campañas](#asignacion-campanas)
4. [Uso de Plantillas](#plantillas)

---

## 🟢 WPPConnect (QR Local)

### Requisitos
- Número de WhatsApp sin WhatsApp Business API configurado
- Acceso físico al teléfono para escanear QR
- Backend corriendo con WPPConnect service activo

### Paso a Paso

#### 1. Crear Número en el Sistema
1. Ve a **WhatsApp** en el menú lateral (solo Supervisor/Admin)
2. Click en **"Agregar Número"**
3. Completa el formulario:
   - **Nombre Descriptivo**: Ej: "Línea Cobranza Principal"
   - **Número de Teléfono**: 573001234567 (con código de país, sin +)
   - **Proveedor**: Selecciona **"WPPConnect (QR Local)"**
   - **Campaña**: (Opcional) Asigna a una campaña específica
4. Click en **"Crear"**

#### 2. Conectar con Código QR
1. En la tabla de números, localiza el número creado
2. Click en el ícono de **QR** (📱)
3. Aparecerá un diálogo con el código QR
4. En tu teléfono:
   - Abre **WhatsApp**
   - Ve a **Configuración > Dispositivos vinculados**
   - Toca **"Vincular un dispositivo"**
   - Escanea el código QR mostrado en pantalla
5. Espera la confirmación (máx. 30 segundos)
6. El estado cambiará a **"Conectado"** ✅

#### 3. Verificar Conexión
- El chip de estado debe mostrar **"Conectado"** en verde
- Si aparece error, revisa:
  - Conexión a internet del servidor
  - Logs del backend: `npm run start:dev`
  - Carpeta `backend/tokens/` debe contener archivos `.data.json`

#### 4. Desconectar (si es necesario)
1. Click en el ícono de **error** (🔴) junto al número
2. Confirma la desconexión
3. En el teléfono, elimina el dispositivo vinculado desde WhatsApp

---

## ☁️ Meta Cloud API

### Requisitos
- Cuenta de Facebook Business
- Número de teléfono verificado en Meta Business
- WhatsApp Business API activado
- Token de acceso permanente (recomendado)

### Paso a Paso

#### 1. Configurar en Facebook Developers

##### A. Crear App de Facebook
1. Ve a [developers.facebook.com](https://developers.facebook.com)
2. Click en **"Mis Apps"** > **"Crear app"**
3. Selecciona **"Empresa"** como tipo
4. Completa:
   - **Nombre de la app**: "NGS&O CRM WhatsApp"
   - **Correo de contacto**: tu email
5. Click **"Crear app"**

##### B. Agregar Producto WhatsApp
1. En el dashboard de tu app, busca **"WhatsApp"**
2. Click en **"Configurar"**
3. Sigue el asistente:
   - Selecciona tu **Business Account** (o crea uno nuevo)
   - Agrega el número de teléfono
   - Verifica el número (recibirás SMS/llamada)

##### C. Obtener Credenciales
1. Ve a **WhatsApp > Configuración**
2. Copia los siguientes datos:

   **Token de Acceso Temporal** (24h):
   ```
   EAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

   **ID del Número de Teléfono**:
   ```
   123456789012345
   ```

   **ID de la Cuenta de WhatsApp Business**:
   ```
   123456789012345
   ```

##### D. Generar Token Permanente (Recomendado)
1. Ve a **Configuración > Básica**
2. Copia el **App ID** y **App Secret**
3. Ve a **Herramientas > Graph API Explorer**
4. Genera un token con estos permisos:
   - `whatsapp_business_management`
   - `whatsapp_business_messaging`
5. Usa este endpoint para hacerlo permanente:
   ```bash
   curl -X GET "https://graph.facebook.com/oauth/access_token?grant_type=fb_exchange_token&client_id=APP_ID&client_secret=APP_SECRET&fb_exchange_token=TEMP_TOKEN"
   ```

#### 2. Configurar en NGS&O CRM

1. Ve a **WhatsApp** en el menú
2. Click en **"Agregar Número"**
3. Completa:
   - **Nombre**: "Línea Meta Principal"
   - **Número**: 573001234567
   - **Proveedor**: **"Meta Cloud API"**
4. Click **"Crear"**
5. En la tabla, click en el ícono de **configuración** (⚙️)
6. Pega las credenciales:
   - **Access Token**: El token generado
   - **Phone Number ID**: ID del número
   - **Business Account ID**: ID de la cuenta
7. Click **"Guardar y Verificar"**
8. Si todo está correcto, el estado cambiará a **"Conectado"** ✅

#### 3. Configurar Webhook (Opcional pero Recomendado)

1. En Facebook Developers, ve a **WhatsApp > Configuración > Webhooks**
2. Click **"Editar"**
3. Configura:
   - **URL de devolución de llamada**:
     ```
     https://tu-dominio.com/api/v1/webhook/meta
     ```
   - **Token de verificación**: `ngso-crm-webhook-token-2024`
4. Suscribirse a campos:
   - ✅ `messages`
   - ✅ `message_status`

---

## 🎯 Asignación de Números a Campañas

### Estrategias de Asignación

#### 1. Un Número por Campaña (1:1)
**Uso**: Campañas independientes con alto volumen
```
Campaña "Cobranza Judicial" → Número 573001111111
Campaña "Preventiva" → Número 573002222222
```

#### 2. Un Número para Varias Campañas (1:N)
**Uso**: Campañas relacionadas, bajo volumen
```
Número 573003333333 → [Preventiva, Seguimiento, Cierre]
```

#### 3. Número Global (Sin Asignar)
**Uso**: Número backup o pruebas
```
Número 573009999999 → Sin campaña asignada
```

### Cómo Asignar

**Método 1: Al Crear el Número**
1. En el diálogo "Agregar Número"
2. Selecciona la **Campaña** en el dropdown
3. Click "Crear"

**Método 2: Después de Crear**
1. Localiza el número en la tabla
2. En la columna **"Campaña"**, usa el dropdown
3. Selecciona la campaña deseada
4. Se guarda automáticamente ✅

---

## 📝 Uso de Plantillas (Quick Replies)

### Crear Plantillas

1. Ve a **Plantillas** en el menú lateral
2. Click en **"Crear Plantilla"**
3. Completa el formulario:

   **Ejemplo 1: Saludo Inicial**
   ```
   Shortcut: /saludo
   Título: Saludo Inicial
   Contenido: Hola {{clientName}}, soy {{agentName}} de NGS&O. ¿En qué puedo ayudarte hoy?
   Categoría: Saludo
   Campaña: Global (todas)
   ```

   **Ejemplo 2: Recordatorio de Pago**
   ```
   Shortcut: /recordatorio
   Título: Recordatorio Deuda
   Contenido: {{clientName}}, te recordamos que tienes una deuda pendiente de ${{debtAmount}} con {{daysOverdue}} días de mora. ¿Cuándo podrás realizar el pago?
   Categoría: Recordatorio
   Campaña: Cobranza
   ```

   **Ejemplo 3: Cierre de Chat**
   ```
   Shortcut: /despedida
   Título: Despedida
   Contenido: Gracias por tu atención {{clientName}}. Quedamos atentos a tu pago. ¡Que tengas excelente día!
   Categoría: Cierre
   Campaña: Global
   ```

4. Click **"Crear"**

### Variables Disponibles

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `{{clientName}}` | Nombre completo del cliente | "Juan Perez" |
| `{{debtAmount}}` | Monto de deuda | "150000" |
| `{{daysOverdue}}` | Días de mora | "45" |
| `{{agentName}}` | Nombre del agente | "Maria Rodriguez" |
| `{{campaignName}}` | Nombre de la campaña | "Cobranza Judicial" |
| `{{current_date}}` | Fecha actual | "2024-11-20" |

### Usar Plantillas en el Chat

**Método 1: Shortcut Directo**
1. En el campo de mensaje del chat
2. Escribe el shortcut: `/saludo`
3. Presiona **Enter** o **Tab**
4. La plantilla se inserta con variables reemplazadas

**Método 2: Menú de Plantillas**
1. Click en el ícono **⚡ Plantillas** junto al campo de mensaje
2. Busca la plantilla deseada
3. Click en la plantilla
4. Se inserta automáticamente

**Método 3: Autocompletado**
1. Escribe `/` en el campo de mensaje
2. Aparece lista de plantillas disponibles
3. Selecciona con flechas ↑↓
4. Presiona Enter para insertar

---

## 🔄 Flujo Completo de Configuración

### Setup Inicial (Una Vez)

```
1. Crear Campañas (si no existen)
   ├─ Ve a "Campañas"
   ├─ Crea "Cobranza", "Preventiva", etc.
   └─ Configura bot flows (opcional)

2. Configurar Números WhatsApp
   ├─ WPPConnect:
   │  ├─ Crear número
   │  ├─ Escanear QR
   │  └─ Verificar conexión
   │
   └─ Meta Cloud API:
      ├─ Configurar en Facebook
      ├─ Crear número en CRM
      ├─ Pegar credenciales
      └─ Verificar conexión

3. Asignar Números a Campañas
   ├─ Cada número a su campaña
   └─ O dejar global si es único

4. Crear Plantillas de Mensajes
   ├─ Plantillas globales (saludo, despedida)
   ├─ Plantillas por campaña (recordatorios)
   └─ Probar variables
```

### Operación Diaria

```
1. Agente inicia sesión
2. Ve a "Mis Chats"
3. Los chats llegan automáticamente:
   ├─ Webhook de Meta → Backend → Chat asignado
   └─ Sesión WPPConnect → Backend → Chat asignado
4. Agente usa plantillas con /shortcut
5. Supervisor monitorea desde "Dashboard"
```

---

## ✅ Checklist de Validación

### WPPConnect
- [ ] Número creado en el sistema
- [ ] QR escaneado exitosamente
- [ ] Estado "Conectado" en verde
- [ ] Archivo `.data.json` existe en `backend/tokens/`
- [ ] Envío de mensaje de prueba funcional

### Meta Cloud API
- [ ] App creada en Facebook Developers
- [ ] WhatsApp agregado como producto
- [ ] Token permanente generado
- [ ] Credenciales configuradas en CRM
- [ ] Verificación exitosa (estado "Conectado")
- [ ] Webhook configurado (opcional)

### Plantillas
- [ ] Al menos 3 plantillas creadas (saludo, seguimiento, despedida)
- [ ] Variables probadas y funcionando
- [ ] Plantillas globales para todos
- [ ] Plantillas específicas por campaña

### Campañas
- [ ] Campañas creadas con nombres descriptivos
- [ ] Números asignados a campañas correctas
- [ ] Bot flows configurados (opcional)

---

## 🆘 Solución de Problemas

### WPPConnect: QR no se genera
**Síntomas**: Al hacer click en QR, aparece spinner infinito

**Solución**:
```bash
# 1. Verificar logs del backend
cd backend
npm run start:dev

# 2. Revisar carpeta tokens
ls -la tokens/

# 3. Eliminar sesión antigua (si existe)
rm tokens/573001234567.data.json

# 4. Reiniciar servicio
# Detener backend (Ctrl+C)
npm run start:dev

# 5. Intentar de nuevo generar QR
```

### Meta: Error "Invalid Token"
**Síntomas**: Estado "Error" después de configurar

**Solución**:
1. Verifica que el token sea permanente (no temporal 24h)
2. Revisa permisos del token:
   - `whatsapp_business_management`
   - `whatsapp_business_messaging`
3. Genera nuevo token si es necesario
4. Verifica que Phone Number ID coincida con el número

### Plantillas no se insertan
**Síntomas**: Al escribir /shortcut no pasa nada

**Solución**:
1. Verifica que el shortcut empiece con `/`
2. Revisa permisos del usuario (debe tener `templates:use`)
3. Verifica que la plantilla esté activa
4. Prueba con otra plantilla para descartar conflicto

---

## 📊 Monitoreo y Métricas

### Panel de WhatsApp
- **Números Conectados**: Cantidad de números activos
- **Campañas Activas**: Campañas con números asignados
- **Estado de Conexión**: Tiempo real de cada número

### Panel de Plantillas
- **Total Plantillas**: Cantidad creada
- **Total Usos**: Veces que se han usado
- **Top 5**: Plantillas más populares
- **Por Categoría**: Distribución de uso

### Dashboard Supervisor
- **Mensajes Enviados**: Por número y campaña
- **Tasa de Respuesta**: Porcentaje de clientes que responden
- **Tiempo Promedio**: De respuesta de agentes

---

## 🔐 Permisos Requeridos

### Para Configurar WhatsApp
- **Rol**: Supervisor, Administrador, Super Admin
- **Permisos**:
  - `whatsapp:create`
  - `whatsapp:read`
  - `whatsapp:update`
  - `whatsapp:delete`

### Para Crear Plantillas
- **Rol**: Todos (incluido Agente)
- **Permisos**:
  - `templates:create`
  - `templates:read`
  - `templates:update`
  - `templates:delete`

### Para Usar Plantillas
- **Rol**: Todos
- **Permiso**:
  - `messages:create`

---

## 📚 Recursos Adicionales

- **Documentación Meta Cloud API**: https://developers.facebook.com/docs/whatsapp
- **WPPConnect GitHub**: https://github.com/wppconnect-team/wppconnect
- **Soporte NGS&O**: soporte@ngso.com
- **Video Tutorial**: [En construcción]

---

**Última Actualización**: 20 de noviembre de 2024  
**Versión**: 1.0  
**Desarrollado por**: Alejandro Sandoval - AS Software
