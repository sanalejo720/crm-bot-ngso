# Controles Integrados de Jornada y Estado - NGS&O CRM

**Fecha:** 2 de diciembre de 2025  
**Desarrollador:** Alejandro Sandoval - AS Software  
**Actualización:** Controles unificados en header

---

## 🎯 Problema Resuelto

**Antes:**
- ❌ Controles de jornada solo en sidebar derecho
- ❌ Estado del agente en chip separado
- ❌ Dos chips en header (confuso)
- ❌ No se podía cambiar estado fácilmente

**Ahora:**
- ✅ **UN SOLO CHIP** en header con toda la información
- ✅ Estado del agente Y jornada laboral integrados
- ✅ Cambio de estado directo desde el menú
- ✅ Interfaz limpia y profesional

---

## 🎨 Diseño del Chip Integrado

### Visualización del Chip

El chip ahora muestra **dos estados en uno**:

```
┌────────────────────────────────────────┐
│ ▶️ Trabajando 2h 30m • Disponible  ▼  │
└────────────────────────────────────────┘
     [Jornada]        [Estado Agente]
```

**Barra de color lateral:** Indica el estado del agente
- 🟢 Verde: Disponible
- 🟠 Naranja: Ocupado  
- 🔵 Azul: En descanso
- ⚫ Gris: Desconectado

### Posibles Estados del Chip

| Jornada | Estado Agente | Chip Mostrado |
|---------|---------------|---------------|
| Sin iniciar | Desconectado | `Sin jornada • Desconectado` |
| Sin iniciar | Disponible | `Sin jornada • Disponible` |
| Trabajando | Disponible | `▶️ Trabajando 2h 30m • Disponible` |
| Trabajando | Ocupado | `▶️ Trabajando 2h 30m • Ocupado` |
| En pausa (Almuerzo) | Disponible | `🍽️ Almuerzo 15m • Disponible` |
| En pausa (Break) | En descanso | `☕ Break 10m • En descanso` |

---

## 📋 Menú Desplegable Completo

Al hacer clic en el chip se abre un menú con **3 secciones**:

### 1️⃣ Información de Jornada
```
┌────────────────────────────┐
│ Jornada Laboral           │
│ ─────────────────────────│
│ Entrada: 2:00 PM          │
│ Tiempo: 2h 30m            │
│ Chats: 12 | Mensajes: 145 │
└────────────────────────────┘
```

### 2️⃣ Estado del Agente (NUEVO)
```
┌────────────────────────────┐
│ Estado del Agente         │
│ ─────────────────────────│
│ ✅ Disponible             │ ← Seleccionado
│ ○  Ocupado                │
│ ○  En descanso            │
│ ○  Desconectado           │
└────────────────────────────┘
```

**Radio buttons con colores:**
- ✅ Check verde cuando está activo
- ○ Círculo vacío cuando no está activo
- Colores distintivos para cada estado

### 3️⃣ Acciones de Jornada
```
┌────────────────────────────┐
│ 🚪 Registrar Entrada       │
│ ⏸️ Iniciar Pausa           │
│ 🚪 Registrar Salida        │
└────────────────────────────┘
```

---

## 🔧 Cambios Técnicos

### WorkdayHeaderControls.tsx (ACTUALIZADO)

**Nuevas importaciones:**
```typescript
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { updateAgentState } from '../../store/slices/authSlice';
import { socketService } from '../../services/socket.service';
import type { AgentState } from '../../types/index';
import { CheckCircle, RadioButtonUnchecked } from '@mui/icons-material';
```

**Nuevas funciones:**
```typescript
// Cambiar estado del agente
const handleChangeStatus = (newState: AgentState) => {
  dispatch(updateAgentState(newState));
  socketService.changeAgentState(newState);
};

// Obtener etiqueta y color de estado
const getAgentStatusLabel = (state?: AgentState) => { ... }
const getAgentStatusColor = (state?: AgentState) => { ... }
```

**Chip actualizado:**
```typescript
// Ahora muestra: Jornada • Estado Agente
label={`Trabajando ${getElapsedTime(workday.clockInTime)} • ${agentStatusLabel}`}

// Con borde de color según estado del agente
borderLeft: `4px solid ${agentStatusColor}`
```

**Nueva sección en menú:**
```typescript
{/* Estado del agente */}
<Box sx={{ px: 2, py: 1 }}>
  <Typography variant="subtitle2" fontWeight="bold">
    Estado del Agente
  </Typography>
  <MenuItem onClick={() => handleChangeStatus('available')}>
    {user?.agentState === 'available' ? <CheckCircle /> : <RadioButtonUnchecked />}
    Disponible
  </MenuItem>
  // ... otros estados
</Box>
```

### AppHeader.tsx (SIMPLIFICADO)

**Removido:**
- ❌ Chip de estado del agente separado
- ❌ Menú de estado separado
- ❌ Funciones `handleChangeStatus`, `getStatusColor`, `getStatusLabel`
- ❌ Importaciones de `updateAgentState`, `socketService`, `Chip`, `AgentState`

**Resultado:**
```typescript
// Antes: 2 chips en header
{user?.isAgent && <WorkdayHeaderControls />}
{user?.isAgent && <Chip label={getStatusLabel(user.agentState)} ... />}

// Ahora: 1 chip integrado
{user?.isAgent && <WorkdayHeaderControls />}
```

---

## 🎯 Flujos de Usuario

### Caso 1: Cambiar estado sin pausar trabajo

**Escenario:** Agente está trabajando pero se pone ocupado temporalmente

1. Clic en chip `▶️ Trabajando 2h 30m • Disponible`
2. Ver sección "Estado del Agente"
3. Clic en "🟠 Ocupado"
4. Chip actualiza a `▶️ Trabajando 2h 30m • Ocupado`
5. **Sistema NO asigna chats nuevos** (aunque jornada activa, estado = ocupado)

### Caso 2: Tomar almuerzo

**Escenario:** Agente necesita almorzar

1. Clic en chip `▶️ Trabajando 3h 45m • Disponible`
2. Sección "Estado del Agente" → Clic en "🔵 En descanso"
3. Sección "Acciones" → Clic en "⏸️ Iniciar Pausa"
4. Seleccionar "🍽️ Almuerzo"
5. Chip actualiza a `🍽️ Almuerzo 0m • En descanso`
6. **Sistema NO asigna chats** (en pausa)

### Caso 3: Volver de almuerzo

**Escenario:** Agente termina almuerzo

1. Clic en chip `🍽️ Almuerzo 45m • En descanso`
2. Sección "Acciones" → Clic en "▶️ Reanudar Trabajo"
3. Sección "Estado del Agente" → Clic en "🟢 Disponible"
4. Chip actualiza a `▶️ Trabajando 4h 30m • Disponible`
5. **Sistema asigna chats normalmente**

---

## 📊 Validación de Asignación

El backend verifica **2 condiciones** para asignar chats:

### 1. Jornada Laboral Activa
```typescript
// UsersService.getAvailableAgents()
const workday = await workdayService.getCurrentWorkday(agent.id);
if (workday && workday.currentStatus === 'working' && !workday.clockOutTime) {
  // ✅ Jornada OK
}
```

### 2. Estado del Agente Disponible
```typescript
// UsersService.getAvailableAgents()
.andWhere('user.agentState = :agentState', { agentState: AgentState.AVAILABLE })
```

**Tabla de decisión:**

| Jornada | Estado Agente | ¿Recibe Chats? |
|---------|---------------|----------------|
| ❌ Sin iniciar | Disponible | ❌ NO |
| ✅ Trabajando | ❌ Ocupado | ❌ NO |
| ✅ Trabajando | ❌ En descanso | ❌ NO |
| ✅ Trabajando | ❌ Desconectado | ❌ NO |
| ✅ Trabajando | ✅ Disponible | ✅ **SÍ** |
| ❌ En pausa | Disponible | ❌ NO |

---

## 🎨 Estilos y Colores

### Chip Principal
```typescript
// Sin jornada
bgcolor: 'rgba(255,255,255,0.1)'
color: 'white'

// Trabajando
bgcolor: 'rgba(76, 175, 80, 0.2)' // Verde translúcido
color: 'white'

// En pausa
bgcolor: pauseTypeData.color // Color específico de pausa
color: 'white'

// Borde lateral (siempre)
borderLeft: `4px solid ${agentStatusColor}` // Color de estado
```

### Radio Buttons de Estado
```typescript
// Disponible
color: '#4CAF50' (Verde)

// Ocupado
color: '#FF9800' (Naranja)

// En descanso
color: '#2196F3' (Azul)

// Desconectado
color: '#757575' (Gris)
```

---

## 📱 Responsive Design

El chip se adapta al tamaño de pantalla:

```typescript
// Desktop (> 960px)
label={`Trabajando 2h 30m • Disponible`}

// Tablet (600-960px)
label={`Trabajando • Disponible`}

// Mobile (< 600px)
// Solo icono con tooltip
icon={<PlayCircle />}
```

---

## 🚀 Despliegue

**Frontend compilado:**
- Bundle: 2,067.43 kB (620.13 kB gzipped)
- Tiempo: 32.86s
- ✅ Desplegado en producción

**Archivos modificados:**
1. `frontend/src/components/workday/WorkdayHeaderControls.tsx` (+100 líneas)
2. `frontend/src/components/layout/AppHeader.tsx` (-60 líneas)

**URL:** https://chat-ngso.assoftware.cloud

---

## ✅ Checklist de Funcionalidades

### Controles de Jornada
- [x] Registrar entrada
- [x] Registrar salida
- [x] Iniciar pausa (5 tipos)
- [x] Reanudar trabajo
- [x] Ver tiempo trabajado
- [x] Ver estadísticas (chats/mensajes)
- [x] Auto-actualización cada 60s

### Controles de Estado
- [x] Cambiar a Disponible
- [x] Cambiar a Ocupado
- [x] Cambiar a En descanso
- [x] Cambiar a Desconectado
- [x] Indicador visual del estado actual
- [x] Sincronización con WebSocket

### Validación Backend
- [x] No asignar si no hay jornada
- [x] No asignar si está en pausa
- [x] No asignar si estado != Disponible
- [x] Logs de depuración

---

## 🎓 Mejoras Futuras

1. **Notificaciones:**
   - Avisar si lleva mucho tiempo en pausa
   - Recordar cerrar jornada al final del día

2. **Analytics:**
   - Tiempo promedio en cada estado
   - Productividad por hora del día

3. **Configuración:**
   - Límites de tiempo por tipo de pausa
   - Auto-pause después de inactividad

4. **Mobile:**
   - Gestos para cambiar estado rápido
   - Widget de jornada en home screen

---

## 📞 Soporte

**Desarrollador:** Alejandro Sandoval  
**Sistema:** NGS&O CRM Gestión  
**Versión:** 1.1.0  
**Estado:** ✅ OPERATIVO EN PRODUCCIÓN

---

## 🔑 Resumen Ejecutivo

### Antes vs Después

| Aspecto | Antes | Después |
|---------|-------|---------|
| Chips en header | 2 (jornada + estado) | 1 (integrado) |
| Cambio de estado | Menú separado | En mismo menú |
| Visibilidad | Confusa | Clara y concisa |
| Clics para cambiar estado | 2 | 1 |
| Información visible | Parcial | Completa |

### Impacto

- ✅ **UX mejorada:** Interfaz más limpia y profesional
- ✅ **Eficiencia:** Menos clics para acciones comunes
- ✅ **Control total:** Jornada y estado en un solo lugar
- ✅ **Visualización clara:** Colores y bordes distintivos
- ✅ **Validación robusta:** Backend verifica ambos estados

**El agente ahora tiene control total de su disponibilidad desde cualquier módulo con una interfaz clara e intuitiva.**
