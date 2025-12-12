# Controles de Jornada Laboral en Header - Implementación Completa

**Fecha:** 2 de diciembre de 2025  
**Desarrollador:** Alejandro Sandoval - AS Software  
**Sistema:** NGS&O CRM Gestión - Sistema de Cobranzas

---

## 📋 Resumen de Cambios

Se implementaron controles de jornada laboral en el header global del sistema para que estén disponibles en todos los módulos. Además, se actualizó la lógica de asignación automática de chats para verificar que el agente tenga jornada laboral activa.

---

## ✅ Componentes Implementados

### 1. **WorkdayHeaderControls.tsx** (NUEVO)
**Ubicación:** `frontend/src/components/workday/WorkdayHeaderControls.tsx`

**Características:**
- Chip clickeable en el header que muestra el estado actual de jornada
- Menú desplegable con información de jornada y controles
- Estados visualizados:
  - 🔴 **Desconectado** - Sin jornada activa
  - 🟢 **Trabajando** - En jornada activa (muestra tiempo transcurrido)
  - 🟡 **En Pausa** - Muestra tipo de pausa y tiempo (Almuerzo, Break, Baño, Reunión, Otro)
- Opciones del menú:
  - Ver tiempo trabajado
  - Ver estadísticas (chats y mensajes)
  - Registrar entrada
  - Iniciar pausa (5 tipos)
  - Reanudar trabajo
  - Registrar salida
- Auto-actualización cada 60 segundos

### 2. **AppHeader.tsx** (ACTUALIZADO)
**Ubicación:** `frontend/src/components/layout/AppHeader.tsx`

**Cambios:**
- Importación de `WorkdayHeaderControls`
- Integración del componente entre el título y el estado del agente
- Solo visible para usuarios con rol de Agente (`user.isAgent`)

---

## 🔧 Lógica de Backend Actualizada

### 1. **UsersService** (ACTUALIZADO)
**Ubicación:** `backend/src/modules/users/users.service.ts`

**Cambios:**
- Inyección de `WorkdayService` (con `forwardRef` para evitar dependencias circulares)
- Método `getAvailableAgents()` actualizado:
  ```typescript
  // Antes: Solo verificaba estado del agente y capacidad
  // Ahora: También verifica jornada laboral activa
  ```

**Nueva validación:**
Los agentes deben cumplir **5 criterios** para recibir chats:
1. ✅ Estar en la campaña
2. ✅ Estado activo
3. ✅ Estado disponible (no ocupado ni en pausa)
4. ✅ Capacidad para más chats (< maxConcurrentChats)
5. ✅ **Jornada laboral activa** (clock in y currentStatus='working')

**Logs agregados:**
- Debug de agentes excluidos con razón
- Debug de agentes sin jornada laboral
- Log de agentes disponibles vs candidatos

### 2. **UsersModule** (ACTUALIZADO)
**Ubicación:** `backend/src/modules/users/users.module.ts`

**Cambios:**
- Importación de `WorkdayModule` con `forwardRef`

### 3. **WorkdayModule** (ACTUALIZADO)
**Ubicación:** `backend/src/modules/workday/workday.module.ts`

**Cambios:**
- Importación de `UsersModule` con `forwardRef`

---

## 🎯 Flujo de Funcionamiento

### Escenario 1: Agente inicia jornada
1. Agente hace clic en chip "Desconectado"
2. Selecciona "Registrar Entrada"
3. (Opcional) Añade notas
4. Sistema crea registro en `agent_workdays`
5. `currentStatus` = 'working'
6. Chip cambia a verde "Trabajando (0h 0m)"
7. **Ahora el agente está disponible para recibir chats**

### Escenario 2: Agente toma pausa
1. Agente hace clic en chip "Trabajando"
2. Selecciona "Iniciar Pausa"
3. Elige tipo de pausa (Almuerzo, Break, Baño, Reunión, Otro)
4. (Opcional) Añade motivo
5. Sistema crea registro en `agent_pauses`
6. `currentStatus` = 'on_pause'
7. Chip cambia a color de pausa "Almuerzo (0h 15m)"
8. **Agente ya NO recibirá chats nuevos**

### Escenario 3: Asignación automática de chat
1. Cliente envía mensaje a WhatsApp
2. Sistema crea chat en DB
3. Queue service procesa asignación
4. Llama a `usersService.getAvailableAgents(campaignId)`
5. **Nueva validación:**
   ```typescript
   // Verifica jornada laboral activa
   const workday = await workdayService.getCurrentWorkday(agent.id);
   if (workday && workday.currentStatus === 'working' && !workday.clockOutTime) {
     // ✅ Agente elegible
   } else {
     // ❌ Excluido: sin jornada o en pausa
   }
   ```
6. Solo agentes con jornada activa reciben chat

---

## 📊 Estados de Jornada

| Estado | Color | Descripción | Puede recibir chats |
|--------|-------|-------------|---------------------|
| **offline** | Gris | Sin jornada iniciada | ❌ NO |
| **working** | Verde | Trabajando activamente | ✅ SÍ |
| **on_pause** | Amarillo/Naranja/Azul | En pausa (lunch/break/bathroom/meeting/other) | ❌ NO |

---

## 🎨 Interfaz Visual

### Header - Chip de Jornada
```
┌─────────────────────────────────────────────┐
│ 🏢 NGS&O    CRM Gestión    [▶️ Trabajando (2h 30m) ▼]  👤 │
└─────────────────────────────────────────────┘
```

### Menú Desplegable
```
┌────────────────────────────┐
│ Jornada Laboral           │
│ ─────────────────────────│
│ Entrada: 2:00 PM          │
│ Tiempo: 2h 30m            │
│ Chats: 12 | Mensajes: 145 │
│ ─────────────────────────│
│ ⏸️ Iniciar Pausa          │
│ 🚪 Registrar Salida       │
└────────────────────────────┘
```

---

## 🗂️ Archivos Modificados

### Frontend
1. **NUEVO:** `frontend/src/components/workday/WorkdayHeaderControls.tsx` (380 líneas)
2. **ACTUALIZADO:** `frontend/src/components/layout/AppHeader.tsx`
   - Importación de WorkdayHeaderControls
   - Integración en el layout

### Backend
1. **ACTUALIZADO:** `backend/src/modules/users/users.service.ts`
   - Inyección de WorkdayService
   - Método getAvailableAgents() con validación de jornada
2. **ACTUALIZADO:** `backend/src/modules/users/users.module.ts`
   - Importación de WorkdayModule
3. **ACTUALIZADO:** `backend/src/modules/workday/workday.module.ts`
   - Importación de UsersModule (forwardRef)

---

## 🚀 Despliegue

### Frontend
```bash
# Compilación
cd frontend
npm run build
# Bundle: 2,066.27 kB (619.92 kB gzipped)

# Despliegue
tar -czf frontend-workday-header.tar.gz dist
scp frontend-workday-header.tar.gz root@72.61.73.9:/var/www/crm-ngso-whatsapp/frontend/
ssh root@72.61.73.9 "cd /var/www/crm-ngso-whatsapp/frontend && rm -rf dist && tar -xzf frontend-workday-header.tar.gz"
```

### Backend
```bash
# Compilación
cd backend
npm run build
# Compilación exitosa

# Despliegue
tar -czf backend-workday-validation.tar.gz dist
scp backend-workday-validation.tar.gz root@72.61.73.9:/var/www/crm-ngso-whatsapp/backend/
ssh root@72.61.73.9 "cd /var/www/crm-ngso-whatsapp/backend && rm -rf dist && tar -xzf backend-workday-validation.tar.gz && pm2 restart crm-backend"
```

**Estado:** ✅ Desplegado exitosamente en producción (5:03 PM)

---

## 📝 Base de Datos

**Tablas utilizadas:**
- `agent_workdays` - Registro de jornadas
- `agent_pauses` - Registro de pausas
- `agent_workday_events` - Eventos de jornada

**Campos clave:**
- `agent_workdays.currentStatus` - Estado actual (offline/working/on_pause)
- `agent_workdays.clockInTime` - Hora de entrada
- `agent_workdays.clockOutTime` - Hora de salida (null si activa)
- `agent_pauses.pauseType` - Tipo de pausa (lunch/break/bathroom/meeting/other)
- `agent_pauses.endTime` - Fin de pausa (null si activa)

---

## 🔍 Testing y Validación

### Casos de Prueba
1. ✅ Agente ve controles en header en todos los módulos
2. ✅ Agente puede iniciar jornada desde cualquier página
3. ✅ Agente puede tomar pausa sin salir de la página actual
4. ✅ Sistema NO asigna chats a agentes sin jornada activa
5. ✅ Sistema NO asigna chats a agentes en pausa
6. ✅ Sistema SÍ asigna chats a agentes con jornada activa
7. ✅ Actualización automática cada 60 segundos
8. ✅ Persistencia de datos tras refresco de página

### URLs de Producción
- **Frontend:** https://chat-ngso.assoftware.cloud
- **Backend:** https://chat-ngso.assoftware.cloud/api/v1
- **Docs API:** https://chat-ngso.assoftware.cloud/api/docs

---

## 📈 Beneficios Implementados

1. ✅ **Control efectivo:** Supervisor ve estado de agentes en tiempo real
2. ✅ **Disponibilidad global:** Controles accesibles desde cualquier módulo
3. ✅ **Asignación inteligente:** Solo agentes trabajando reciben chats
4. ✅ **Seguimiento preciso:** Registro completo de tiempos y pausas
5. ✅ **Experiencia mejorada:** No necesita ir al dashboard para controlar jornada
6. ✅ **Prevención de errores:** Sistema valida automáticamente disponibilidad

---

## 🎓 Próximos Pasos Sugeridos

1. **Dashboard de supervisión:** Ver pausas de todos los agentes en tiempo real
2. **Alertas de inactividad:** Notificar si agente olvida reanudar tras pausa
3. **Reportes de jornada:** Exportar tiempos trabajados por periodo
4. **Límites de pausa:** Configurar tiempo máximo por tipo de pausa
5. **Métricas avanzadas:** Productividad vs tiempo trabajado

---

## 📞 Soporte

**Desarrollador:** Alejandro Sandoval  
**Email:** asoftware@ngso.com.co  
**Sistema:** NGS&O CRM Gestión  
**Versión:** 1.0.0  
**Fecha de implementación:** 2 de diciembre de 2025

---

## 🔐 Seguridad

- ✅ Solo agentes ven controles de jornada
- ✅ Endpoints protegidos con JWT
- ✅ Validación de roles en backend
- ✅ Prevención de inyección SQL (TypeORM)
- ✅ Sanitización de entradas de usuario

---

**Estado del Sistema:** ✅ OPERATIVO EN PRODUCCIÓN
