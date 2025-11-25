# 📊 Sistema de Monitoreo y Gestión de Sesiones WhatsApp

## ✅ Funcionalidades Implementadas

### 1. **Límite de Sesiones Activas**
- **Límite configurado**: 10 sesiones simultáneas (configurable en `WhatsappNumbersService.MAX_ACTIVE_SESSIONS`)
- **Validación automática** antes de crear nuevas sesiones
- **Endpoint**: `GET /api/v1/whatsapp-numbers/sessions/can-create`

### 2. **Gestión Manual de Sesiones**

#### Cerrar Sesión Individual:
```
POST /api/v1/whatsapp-numbers/:id/session/close
```
- Cierra una sesión específica
- Limpia recursos de Chrome/Puppeteer
- Actualiza estado en base de datos

#### Cerrar Todas las Sesiones:
```
POST /api/v1/whatsapp-numbers/sessions/close-all
```
- Cierra todas las sesiones activas
- Útil para reinicio o mantenimiento
- Retorna estadísticas de cierre

#### Ver Sesiones Activas:
```
GET /api/v1/whatsapp-numbers/sessions/active
```
Retorna:
- Total de sesiones registradas
- Sesiones actualmente conectadas
- Límite máximo
- Estadísticas por sesión (mensajes, uptime, alertas)

---

### 3. **Dashboard de Actividad de Números**

#### Ranking por Actividad:
```
GET /api/v1/monitoring/numbers/ranking?limit=10&days=7
```
Muestra los números con **mayor actividad** en los últimos N días:
- Total de mensajes
- Mensajes enviados vs recibidos
- Último mensaje
- Ordenado por volumen

#### Estadísticas de Número Específico:
```
GET /api/v1/monitoring/numbers/:numberId/stats?days=7
```
Retorna:
- Total de mensajes en el período
- Mensajes enviados
- Mensajes recibidos
- Fecha del último mensaje

---

### 4. **Sistema de Alertas de Palabras Ofensivas**

#### Detección Bidireccional:

**A) Palabras ofensivas del ASESOR hacia el CLIENTE:**
- **Abuso**: idiota, estúpido, tonto, burro, imbécil, inútil
- **Amenazas**: amenaza, voy a, te voy, cuidado, problema
- **Discriminación**: negro, indio, pobre, ignorante, analfabeto
- **Groserías**: mierda, carajo, puta, joder, coño, verga, hijueputa

**B) Palabras ofensivas del CLIENTE hacia el ASESOR:**
- **Abuso**: idiota, estúpido, incompetente, inútil, malparido, gonorrea
- **Amenazas**: matar, denunciar, demandar, acusar, quemar, reportar
- **Groserías**: mierda, carajo, puta, hp, hijueputa, maldito

#### Severidad de Alertas:
- **CRITICAL** (Crítico): Amenazas graves, discriminación extrema
- **HIGH** (Alto): Insultos directos, groserías graves
- **MEDIUM** (Medio): Palabras ofensivas moderadas
- **LOW** (Bajo): Lenguaje inapropiado leve

#### Endpoints:

**Ver Palabras Configuradas:**
```
GET /api/v1/monitoring/offensive-words
```

**Agregar Palabra Personalizada:**
```
POST /api/v1/monitoring/offensive-words
Body:
{
  "word": "nuevo_insulto",
  "category": "abuse",
  "severity": "high",
  "target": "both"  // "agent", "client", o "both"
}
```

**Ver Alertas Recientes:**
```
GET /api/v1/monitoring/alerts/recent?limit=50
```

---

### 5. **Estadísticas por Sesión**

Cada sesión activa rastrea:
- **messagesSent**: Mensajes enviados
- **messagesReceived**: Mensajes recibidos
- **totalMessages**: Total de mensajes
- **lastMessageAt**: Fecha del último mensaje
- **connectedSince**: Fecha de conexión
- **uptime**: Tiempo activo en segundos
- **alertCount**: Número de alertas generadas
- **offensiveWordsDetected**: Palabras ofensivas detectadas

---

## 🔐 Permisos Requeridos

Todos los endpoints requieren autenticación JWT y roles:

- **Lectura (GET)**: Supervisor, Administrador, Super Admin
- **Escritura (POST/PATCH)**: Administrador, Super Admin
- **Agregar palabras ofensivas**: Solo Administrador y Super Admin

---

## 📡 Eventos Socket.IO

### Nuevo Evento:
```javascript
socket.on('monitoring.offensive-words-detected', (alert) => {
  // alert contiene:
  // - messageId
  // - chatId
  // - direction (inbound/outbound)
  // - sender (agent/client)
  // - content
  // - matches (array de palabras detectadas)
  // - agentId, agentName
})
```

---

## 🎯 Uso en el Frontend

### Ejemplo: Ver Sesiones Activas
```javascript
const response = await api.get('/whatsapp-numbers/sessions/active');
console.log(response.data);
// {
//   totalSessions: 5,
//   activeSessions: 3,
//   maxSessions: 10,
//   sessions: [...]
// }
```

### Ejemplo: Cerrar Sesión
```javascript
await api.post(`/whatsapp-numbers/${numberId}/session/close`);
```

### Ejemplo: Ver Ranking de Actividad
```javascript
const ranking = await api.get('/monitoring/numbers/ranking?limit=5&days=7');
// Retorna top 5 números más activos en última semana
```

---

## 🔄 Integración con Mensajes

Para activar el análisis automático, **agregar en MessagesService**:

```typescript
import { MonitoringService } from '../monitoring/monitoring.service';

constructor(
  private monitoringService: MonitoringService
) {}

// Al crear un mensaje:
async create(createDto: CreateMessageDto) {
  const message = await this.save(createDto);
  
  // Analizar palabras ofensivas
  this.monitoringService.analyzeMessage(
    message.id,
    message.chatId,
    message.content,
    message.direction,
    message.senderType,
    message.chat?.assignedAgentId,
    message.chat?.assignedAgent?.fullName
  );
  
  return message;
}
```

---

## 📌 Archivos Creados

1. `backend/src/modules/monitoring/monitoring.service.ts` - Servicio de monitoreo
2. `backend/src/modules/monitoring/monitoring.controller.ts` - API REST
3. `backend/src/modules/monitoring/monitoring.module.ts` - Módulo NestJS
4. `backend/src/modules/whatsapp/dto/session-stats.dto.ts` - DTOs de estadísticas

---

## 🚀 Próximos Pasos

1. **Crear componente React para Dashboard de Sesiones**
2. **Panel de Alertas en tiempo real**
3. **Gráficas de actividad por número**
4. **Configuración visual de palabras ofensivas**
5. **Exportar reportes de alertas**

---

**Sistema:** NGS&O CRM Gestión
**Módulo:** WhatsApp Management + Monitoring
**Desarrollado por:** AS Software
**Fecha:** Noviembre 2025
