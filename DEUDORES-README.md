# 📋 MÓDULO DE DEUDORES Y BOT AUTOMÁTICO

## ✅ Funcionalidades Implementadas

### 1. **Módulo de Deudores** (`/api/v1/debtors`)

#### Entidad Debtor
- Información personal: nombre completo, tipo y número de documento, teléfono, email, dirección
- Información de deuda: monto actual, monto inicial, días de mora, última fecha de pago, fecha de promesa
- Estado: active, paid, negotiating, defaulted
- Metadata adicional: producto, número de crédito, fecha de vencimiento
- Auditoría: fecha de creación, última actualización, último contacto

#### Tipos de Documento Soportados
- **CC**: Cédula de Ciudadanía
- **CE**: Cédula de Extranjería
- **NIT**: Número de Identificación Tributaria
- **TI**: Tarjeta de Identidad
- **PASSPORT**: Pasaporte

---

## 🔌 Endpoints API

### 1. Crear Deudor Manualmente
```http
POST /api/v1/debtors
Authorization: Bearer {token}
Content-Type: application/json

{
  "fullName": "Juan Pérez García",
  "documentType": "CC",
  "documentNumber": "1234567890",
  "phone": "3001234567",
  "email": "juan.perez@email.com",
  "address": "Calle 123 #45-67",
  "debtAmount": 1500000,
  "initialDebtAmount": 2000000,
  "daysOverdue": 45,
  "lastPaymentDate": "2025-01-15",
  "promiseDate": "2025-12-30",
  "status": "active",
  "notes": "Cliente con historial de cumplimiento",
  "metadata": {
    "producto": "Crédito Personal",
    "numeroCredito": "CRE-2024-001",
    "fechaVencimiento": "2024-12-31"
  }
}
```

**Response 201:**
```json
{
  "message": "Deudor creado exitosamente",
  "data": {
    "id": "uuid",
    "fullName": "Juan Pérez García",
    "documentType": "CC",
    "documentNumber": "1234567890",
    ...
  }
}
```

---

### 2. Listar Deudores (con paginación)
```http
GET /api/v1/debtors?page=1&limit=50
Authorization: Bearer {token}
```

**Response 200:**
```json
{
  "message": "Deudores recuperados exitosamente",
  "data": [
    {
      "id": "uuid",
      "fullName": "Juan Pérez",
      "documentType": "CC",
      "documentNumber": "1234567890",
      "phone": "3001234567",
      "debtAmount": 1500000,
      "daysOverdue": 45,
      ...
    }
  ],
  "meta": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "totalPages": 3
  }
}
```

---

### 3. Buscar Deudor por Documento
```http
GET /api/v1/debtors/search/{documentType}/{documentNumber}
Authorization: Bearer {token}

Ejemplo:
GET /api/v1/debtors/search/CC/1234567890
```

**Response 200:**
```json
{
  "message": "Deudor encontrado",
  "data": {
    "id": "uuid",
    "fullName": "Juan Pérez García",
    "documentType": "CC",
    "documentNumber": "1234567890",
    "phone": "3001234567",
    "debtAmount": 1500000,
    "initialDebtAmount": 2000000,
    "daysOverdue": 45,
    "status": "active",
    "metadata": {
      "producto": "Crédito Personal",
      "numeroCredito": "CRE-2024-001"
    }
  }
}
```

---

### 4. Buscar Deudor por Teléfono
```http
GET /api/v1/debtors/phone/{phone}
Authorization: Bearer {token}

Ejemplo:
GET /api/v1/debtors/phone/3001234567
```

**Response 200:**
```json
{
  "message": "Deudor encontrado",
  "data": {
    "id": "uuid",
    "fullName": "Juan Pérez García",
    ...
  }
}
```

Si no se encuentra:
```json
{
  "message": "Deudor no encontrado",
  "data": null
}
```

---

### 5. **CARGAR CSV DE DEUDORES** (Masivo)
```http
POST /api/v1/debtors/upload-csv
Authorization: Bearer {token}
Content-Type: multipart/form-data

Form Data:
  file: deudores.csv
```

**Formato del CSV:**
```csv
fullName,documentType,documentNumber,phone,email,address,debtAmount,initialDebtAmount,daysOverdue,lastPaymentDate,promiseDate,status,notes,producto,numeroCredito,fechaVencimiento
Carlos Morales,CC,1234567890,3001112233,carlos@email.com,Calle 123,1500000,2000000,45,2024-10-01,2025-12-15,active,Cliente moroso,Crédito Personal,CRE-001,2024-12-31
Maria Lopez,CC,9876543210,3147512827,maria@email.com,Carrera 45,2500000,3000000,60,,,active,,Crédito Comercial,CRE-002,2024-11-30
```

**Columnas del CSV:**
- **Requeridas**: `fullName`, `documentType`, `documentNumber`
- **Opcionales**: `phone`, `email`, `address`, `debtAmount`, `initialDebtAmount`, `daysOverdue`, `lastPaymentDate`, `promiseDate`, `status`, `notes`, `producto`, `numeroCredito`, `fechaVencimiento`

**Response 200:**
```json
{
  "message": "CSV procesado exitosamente",
  "data": {
    "created": 45,
    "updated": 5,
    "errorsCount": 2,
    "errors": [
      "Fila 10: Tipo de documento inválido: XXX",
      "Fila 15: Faltan campos requeridos"
    ]
  }
}
```

---

## 🤖 Activación Automática del Bot

### ¿Cómo Funciona?

Cuando un mensaje de WhatsApp llega al sistema:

1. **Listener de Bot** (`BotListenerService`) detecta el evento `message.created`
2. Verifica si el chat tiene asesor asignado:
   - **SI tiene asesor**: El mensaje va directo al agente
   - **NO tiene asesor**: Activa el bot automáticamente
3. Busca al deudor por teléfono:
   - **Si lo encuentra**: Carga sus datos (nombre, documento, deuda, mora)
   - **Si NO lo encuentra**: El bot preguntará tipo y número de documento
4. Inicia el flujo de bot configurado en la campaña

### Configuración de Campaña

Para que el bot se active automáticamente, la campaña debe tener:

```json
{
  "settings": {
    "botEnabled": true,
    "botFlowId": "uuid-del-flujo",
    "autoAssignment": false  // O true, según preferencia
  }
}
```

### Variables del Bot Disponibles

El bot tiene acceso a estas variables:

```javascript
{
  // Información del contacto
  "clientName": "Nombre del cliente",
  "clientPhone": "573001234567",
  
  // Si el deudor fue encontrado
  "debtorFound": true,
  "debtorName": "Carlos Morales Rodriguez",
  "documentType": "CC",
  "documentNumber": "1234567890",
  "debtAmount": 1500000,
  "daysOverdue": 45,
  "status": "active"
}
```

---

## 🧪 Testing

### 1. Ejecutar Test Completo
```bash
# Asegúrate de que el backend esté corriendo
node test-debtors.js
```

El script realiza:
1. ✓ Autenticación
2. ✓ Carga de CSV de ejemplo (`deudores-ejemplo.csv`)
3. ✓ Listar deudores
4. ✓ Buscar por documento (CC 1234567890)
5. ✓ Buscar por teléfono (3147512827)
6. ℹ Instrucciones para probar bot

### 2. Probar Activación de Bot

**Pasos:**
1. Asegúrate de que:
   - Backend está corriendo
   - WhatsApp 3334309474 está conectado
   - La campaña tiene `botEnabled: true` y `botFlowId` configurado
2. Envía un mensaje de WhatsApp al **3334309474**
3. El bot debería:
   - Activarse automáticamente (sin asesor)
   - Buscar al deudor por tu teléfono
   - Responder con información personalizada

**Números de prueba en el CSV:**
- `3001112233` - Carlos Morales (deuda: $1,500,000)
- `3147512827` - Maria Lopez (deuda: $2,500,000)
- `3201234567` - Juan Ramirez (deuda: $800,000)

---

## 📊 Flujo Completo del Bot de Cobranza

### Escenario 1: Deudor Encontrado por Teléfono

```
Usuario: "Hola"

Bot: "¡Hola Carlos Morales Rodriguez! 👋
      
      Veo que tienes un crédito pendiente:
      💰 Monto: $1,500,000
      📅 Mora: 45 días
      
      ¿Cómo podemos ayudarte?
      1️⃣ Pagar ahora
      2️⃣ Acordar fecha de pago
      3️⃣ Hablar con un asesor"
```

### Escenario 2: Deudor NO Encontrado por Teléfono

```
Usuario: "Hola"

Bot: "¡Hola! 👋 Para poder ayudarte, necesito verificar tu información.
     
     Por favor indica:
     1. Tipo de documento (CC, CE, TI, etc.)
     2. Número de documento"

Usuario: "CC 9876543210"

Bot: "✓ Encontré tu información, Maria Fernanda Lopez.
     
     Tienes un crédito pendiente:
     💰 Monto: $2,500,000
     📅 Mora: 60 días
     
     ¿Qué deseas hacer?
     1️⃣ Pagar ahora
     2️⃣ Acordar fecha de pago
     3️⃣ Hablar con un asesor"
```

### Escenario 3: NO Existe en Base de Datos

```
Usuario: "Hola"

Bot: "Por favor indica tu tipo y número de documento."

Usuario: "CC 9999999999"

Bot: "❌ No encontramos información asociada a este documento.
     
     ¿Deseas hablar con un asesor?
     1️⃣ Sí, hablar con asesor
     2️⃣ No, gracias"
```

---

## 📝 Notas Importantes

1. **Seguridad**: Todos los endpoints requieren autenticación JWT
2. **CSV**: Máximo 10MB de tamaño
3. **Duplicados**: Si un deudor ya existe (mismo documento), se actualiza su información
4. **Última Contacto**: Se actualiza automáticamente cuando:
   - Se busca al deudor
   - El bot interactúa con él
5. **Bot Listener**: El listener solo funciona si:
   - La campaña tiene `botEnabled: true`
   - La campaña tiene un `botFlowId` válido
   - El chat NO tiene asesor asignado

---

## 🚀 Siguiente Paso: Crear Flujo de Bot

Para completar la funcionalidad, necesitas crear un flujo de bot que:

1. Salude al deudor con su nombre y datos de deuda
2. Presente opciones (pagar, acordar fecha, hablar con asesor)
3. Capture documento si no se encontró por teléfono
4. Busque en la BD con el método `searchDebtorByDocument()`
5. Transfiera a asesor si es necesario

**El flujo de bot se crea mediante el endpoint:**
```http
POST /api/v1/bot-flows
```

O puedes usar Swagger UI en:
```
http://localhost:3000/api/docs
```

---

## ✅ Resumen

**Módulo Completo:**
- ✅ Entidad Debtor con toda la información necesaria
- ✅ 5 endpoints CRUD para gestión de deudores
- ✅ Carga masiva desde CSV
- ✅ Búsqueda por documento y por teléfono
- ✅ Listener de bot que activa automáticamente
- ✅ Integración con sistema de chats existente
- ✅ Variables disponibles para flujos de bot
- ✅ Test completo incluido
- ✅ CSV de ejemplo con 5 deudores

**Pendiente:**
- ⏳ Crear flujo de bot específico (nodos y transiciones)
- ⏳ Configurar campaña con botFlowId
- ⏳ Probar flujo completo con mensaje real
