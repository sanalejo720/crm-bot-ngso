# 🧪 Guía de Testing - SupervisorDashboard

## Configuración

### 1. Iniciar Backend
```powershell
cd D:\crm-ngso-whatsapp\backend
npm run start:dev
```

### 2. Iniciar Frontend
```powershell
cd D:\crm-ngso-whatsapp\frontend
npm run dev
```

## Testing del Dashboard

### Paso 1: Acceder como Supervisor
1. Ir a http://localhost:5173/login
2. Credenciales de supervisor (necesitas crear un usuario supervisor)
   - O usar admin@crm.com / password123 (tiene todos los permisos)

### Paso 2: Navegar al Dashboard
1. Una vez autenticado, ir a: http://localhost:5173/dashboard
2. O agregar un botón en AppHeader para acceder al dashboard

### Paso 3: Verificar Tarjetas de Estadísticas

**Tarjeta 1: Agentes**
- ✅ Debe mostrar: "3 / 7" (3 activos de 7 totales)
- Icon: People (👥)
- Color: Verde (#2e7d32)

**Tarjeta 2: Chats**
- ✅ Debe mostrar: "2 / 4" (2 activos de 4 totales)
- Icon: Chat (💬)
- Color: Azul (#1976d2)

**Tarjeta 3: Cartera**
- ✅ Debe mostrar: "$ 13,400,000" (total de deuda)
- ✅ Debe mostrar: "Recuperado hoy: $ 1,000,000" (si Roberto Sánchez tiene promesa hoy)
- Icon: AttachMoney (💰)
- Color: Naranja (#ed6c02)

**Tarjeta 4: Tareas**
- ✅ Debe mostrar: "0" (no hay tareas creadas aún)
- Icon: Assignment (📋)
- Color: Morado (#9c27b0)

### Paso 4: Verificar Tabla de Rendimiento de Agentes

**Columnas esperadas:**
1. Agente (nombre completo)
2. Estado (chip con color)
3. Chats (barra de progreso con currentChats/maxChats)
4. Mensajes (contador de mensajes enviados hoy)
5. Promesas (contador de promesas obtenidas hoy)
6. T. Respuesta (tiempo medio de respuesta en segundos)
7. Acciones (botón ver detalles)

**Datos esperados:**

| Agente | Estado | Chats | Mensajes | Promesas | T. Respuesta |
|--------|--------|-------|----------|----------|--------------|
| Juan Pérez | Disponible | 1/5 (20%) | 1 | 0 | ~60s |
| Laura Gómez | Disponible | 1/5 (20%) | 1 | 0 | ~60s |
| Pedro Ramírez | Disponible | 0/5 (0%) | 0 | 0 | 0s |

**Estados posibles:**
- 🟢 Disponible (verde)
- 🟡 Ocupado (amarillo)
- 🔵 En descanso (azul)
- ⚫ Desconectado (gris)

### Paso 5: Verificar Auto-Refresh
1. Abrir DevTools (F12)
2. Ir a la pestaña Network
3. Esperar 30 segundos
4. Verificar que se hagan requests a:
   - GET /api/v1/reports/system/stats
   - GET /api/v1/reports/agents/performance

### Paso 6: Testing de Actualización en Tiempo Real

**Test 1: Enviar mensaje desde cuenta de agente**
1. Abrir una ventana de incógnito
2. Login con juan@crm.com / password123
3. Ir a /workspace
4. Enviar un mensaje a Patricia Gómez
5. Volver a la ventana del dashboard
6. Esperar hasta el próximo refresh (máx 30 segundos)
7. ✅ Verificar que "Mensajes" de Juan Pérez aumenta en 1

**Test 2: Cambiar estado de agente**
1. En la ventana de juan@crm.com
2. Cambiar estado a "Ocupado"
3. Volver al dashboard
4. Esperar refresh
5. ✅ Verificar que el chip de Juan cambia a amarillo "Ocupado"
6. ✅ Verificar que "Agentes Activos" se mantiene igual (Ocupado sigue siendo activo)

**Test 3: Crear promesa de pago**
1. En la ventana de juan@crm.com
2. En DebtorPanel, hacer clic en "Registrar Promesa"
3. Ingresar monto: 500000
4. Seleccionar fecha: HOY
5. Guardar
6. Volver al dashboard
7. Esperar refresh
8. ✅ Verificar que "Promesas" de Juan aumenta en 1
9. ✅ Verificar que "Recuperado hoy" aumenta en $500,000

## Testing de Permisos

### Crear Usuario Supervisor
```sql
-- Conectar a PostgreSQL
psql -U postgres -d crm_whatsapp

-- Insertar usuario supervisor
INSERT INTO users (id, email, password, "fullName", "roleId", "isAgent", "agentState", "isActive")
VALUES (
  gen_random_uuid(),
  'supervisor@crm.com',
  '$2b$10$IQ/XlMFHCpJn6TLG52nm7e9f9WQU5H7GqKZ7aJYZ0V8kQZ8kQZ8kQ',
  'Carlos Supervisor',
  (SELECT id FROM roles WHERE name = 'Supervisor'),
  false,
  null,
  true
);
```

### Test de Permisos
1. Login con supervisor@crm.com / password123
2. Ir a /dashboard
3. ✅ Debe cargar correctamente (tiene permiso reports:read)
4. Intentar ir a /workspace
5. ⚠️ Debe redirigir o mostrar mensaje (no es agente)

## Troubleshooting

### Error: "Cannot read properties of undefined"
**Causa:** Backend no está devolviendo datos correctos
**Solución:**
```powershell
# Verificar que backend esté ejecutándose
curl http://localhost:3000/api/v1/reports/system/stats

# Debe devolver JSON con: totalAgents, activeAgents, totalChats, activeChats, totalDebt, recoveredToday, pendingTasks
```

### Error: "401 Unauthorized"
**Causa:** Token JWT expirado o inválido
**Solución:**
1. Logout y login nuevamente
2. Verificar que el token se esté enviando en el header Authorization

### Error: "403 Forbidden"
**Causa:** Usuario no tiene permiso reports:read
**Solución:**
```sql
-- Agregar permiso reports:read al rol del usuario
INSERT INTO role_permissions ("roleId", "permissionId")
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'Tu_Rol' AND p.module = 'reports' AND p.action = 'read'
ON CONFLICT DO NOTHING;
```

### Datos en 0 o vacíos
**Causa:** No hay datos en la base de datos
**Solución:**
```powershell
# Ejecutar script de validación
psql -U postgres -d crm_whatsapp -f D:\crm-ngso-whatsapp\backend\scripts\validate-system.sql

# Verificar que hay:
# - Al menos 1 agente activo
# - Al menos 1 chat activo
# - Al menos 1 cliente con deuda
```

## Verificación de API Endpoints

### Test 1: System Stats
```powershell
# Con curl
curl -X GET http://localhost:3000/api/v1/reports/system/stats `
  -H "Authorization: Bearer TU_TOKEN_JWT"

# Respuesta esperada:
{
  "totalAgents": 7,
  "activeAgents": 3,
  "totalChats": 4,
  "activeChats": 2,
  "totalDebt": 13400000,
  "recoveredToday": 1000000,
  "pendingTasks": 0
}
```

### Test 2: Agents Performance
```powershell
curl -X GET http://localhost:3000/api/v1/reports/agents/performance `
  -H "Authorization: Bearer TU_TOKEN_JWT"

# Respuesta esperada:
[
  {
    "id": "uuid-juan",
    "name": "Juan Pérez",
    "email": "juan@crm.com",
    "currentChats": 1,
    "maxChats": 5,
    "messagesSent": 1,
    "promisesObtained": 0,
    "averageResponseTime": 60,
    "status": "available"
  },
  ...
]
```

## Checklist de Funcionalidad

- [ ] Dashboard carga sin errores
- [ ] Las 4 tarjetas muestran datos correctos
- [ ] Tabla de agentes se llena con datos reales
- [ ] Barras de progreso muestran porcentaje correcto (currentChats/maxChats)
- [ ] Chips de estado tienen el color correcto
- [ ] Auto-refresh funciona cada 30 segundos
- [ ] Datos se actualizan al enviar mensaje desde agente
- [ ] Datos se actualizan al cambiar estado de agente
- [ ] Datos se actualizan al crear promesa de pago
- [ ] Botón "Ver Detalles" existe (aún no implementado)
- [ ] No hay errores en consola del navegador
- [ ] No hay errores en logs del backend

## Próximos Pasos

1. ✅ Dashboard básico funcionando
2. [ ] Agregar gráficas con recharts
3. [ ] Implementar filtros por fecha
4. [ ] Modal de detalles de agente
5. [ ] Exportar a Excel/PDF
6. [ ] Alertas para métricas críticas (TMR > 5min, agentes al límite)

---

**Nota:** Este dashboard es crítico para supervisores. Asegúrate de que los datos sean precisos y actualizados.
