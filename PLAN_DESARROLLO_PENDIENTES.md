# 📋 PLAN DE DESARROLLO - PRÓXIMAS IMPLEMENTACIONES
**Fecha:** 25 de Noviembre, 2025
**Desarrollado por:** Alejandro Sandoval - AS Software

## ✅ COMPLETADO HOY

### 1. Módulo Clientes No Identificados
- ✅ Backend: Controller, Service, Entity, DTOs
- ✅ Frontend: Página completa con DataGrid
- ✅ Permisos creados y asignados
- ✅ Sidebar agregado a todas las páginas
- ✅ Sistema de permisos corregido (getter `name`)
- ✅ ToastContainer configurado

---

## 🎯 PRIORIDAD 1: Carga de Base de Datos (CRÍTICO)

### Backend
- [ ] Crear módulo `Cartera` o extender módulo `Debtors`
- [ ] Endpoint POST `/debtors/upload-csv`
- [ ] Servicio de validación de CSV/Excel
- [ ] Parser con `papaparse` o `xlsx`
- [ ] Validación de columnas obligatorias:
  - tipo_doc, documento, nombre, compania, deuda, mora_dias, campaign_id
- [ ] Detección de duplicados por documento + campaña
- [ ] Inserción masiva con transacciones
- [ ] Reporte de carga (exitosos/fallidos/duplicados)

### Frontend
- [ ] Componente `UploadCarteraDialog`
- [ ] Drag & drop para archivos
- [ ] Validación de formato (CSV, XLSX)
- [ ] Preview de datos antes de cargar
- [ ] Barra de progreso
- [ ] Reporte visual de resultados
- [ ] Integrar en página de Deudores

**Tiempo estimado:** 4-6 horas

---

## 🎯 PRIORIDAD 2: Flujo Bot con Aceptación de Datos

### Backend
- [ ] Nodo especial `data_acceptance` en BotFlows
- [ ] Almacenar consentimiento en `bot_sessions`
- [ ] Lógica de validación de documento
- [ ] Endpoint para consultar en `cartera_clientes`
- [ ] Auto-transferencia a agente si encuentra coincidencia
- [ ] Webhook mejorado para manejar botones de WhatsApp

### Frontend
- [ ] Editor de flujo con nodo "Aceptación de Datos"
- [ ] Template de mensaje de bienvenida
- [ ] Configuración de botones "ACEPTO/NO ACEPTO"
- [ ] Vista previa del flujo completo

**Tiempo estimado:** 6-8 horas

---

## 🎯 PRIORIDAD 3: Gestión de Plantillas (Templates)

### Backend
- [ ] Agregar campo `createdBy` a QuickReplies
- [ ] Agregar campo `status`: draft, pending_approval, approved, rejected
- [ ] Agregar campo `approvedBy` y `approvedAt`
- [ ] Endpoint para aprobar/rechazar plantillas
- [ ] Permisos: solo admin puede crear/editar/eliminar
- [ ] Permisos: agentes solo pueden ver aprobadas

### Frontend
- [ ] Página `TemplatesManagement` (ya existe, mejorar)
- [ ] Modal de creación/edición (solo admin)
- [ ] Sistema de aprobación (admin)
- [ ] Vista de plantillas para agentes (solo lectura)
- [ ] Botón "Usar plantilla" en chat
- [ ] Ocultar variables y código a agentes

**Tiempo estimado:** 4-5 horas

---

## 🎯 PRIORIDAD 4: Reactivación Automática del Bot (24h)

### Backend
- [ ] Cron job que revisa chats inactivos cada hora
- [ ] Query de chats sin actividad en 24h
- [ ] Cerrar chat con status `expired_bot_reset`
- [ ] Crear nueva sesión de bot
- [ ] Enviar mensaje de reactivación
- [ ] Logs de reactivaciones automáticas

### Frontend
- [ ] Badge en chat list para chats expirados
- [ ] Notificación cuando se reactiva un bot
- [ ] Historial de reactivaciones en panel del chat

**Tiempo estimado:** 3-4 horas

---

## 🎯 PRIORIDAD 5: Dashboard Financiero

### Backend (ya existe, verificar)
- [x] Endpoint `/financial/summary`
- [x] Endpoint `/financial/daily`
- [x] Endpoint `/financial/trend`
- [ ] Agregar métricas de:
  - Promesas de pago cumplidas/incumplidas
  - Tasa de conversión por campaña
  - Recaudo proyectado vs real

### Frontend
- [ ] Mejorar `FinancialDashboard.tsx`
- [ ] Gráficas con Recharts:
  - Recaudo diario (Bar Chart)
  - Tendencia mensual (Line Chart)
  - Distribución por campaña (Pie Chart)
  - Ranking de agentes (Table)
- [ ] Filtros por fecha
- [ ] Exportar a Excel

**Tiempo estimado:** 4-5 horas

---

## 📊 RESUMEN DE TIEMPOS

| Prioridad | Feature | Backend | Frontend | Total |
|-----------|---------|---------|----------|-------|
| 1 | Carga de BD | 3h | 3h | **6h** |
| 2 | Flujo Bot | 4h | 4h | **8h** |
| 3 | Plantillas | 2h | 3h | **5h** |
| 4 | Reactivación Bot | 2h | 2h | **4h** |
| 5 | Dashboard Financiero | 1h | 4h | **5h** |

**TOTAL ESTIMADO: 28 horas** (aprox. 3.5 días de trabajo)

---

## 🔧 ORDEN SUGERIDO DE IMPLEMENTACIÓN

1. **Día 1:** Carga de BD (6h)
2. **Día 2:** Gestión de Plantillas (5h) + Dashboard Financiero (5h)
3. **Día 3:** Flujo Bot con Aceptación (8h)
4. **Día 4:** Reactivación Automática (4h) + Testing general (4h)

---

## 📝 NOTAS IMPORTANTES

- ✅ Base sólida: Backend core completo (95%)
- ✅ Frontend base: Componentes principales funcionando
- ✅ WhatsApp: Dual provider funcionando
- ✅ Socket.IO: Tiempo real implementado
- ⚠️ Bot Flow: Necesita mejoras para aceptación de datos
- ⚠️ Templates: Necesita sistema de aprobación
- ⚠️ Cartera: Falta carga masiva

---

## 🚀 PRÓXIMO PASO

**¿Qué implementamos primero?**

Opciones:
1. **Carga de Base de Datos** (más crítico para operar)
2. **Gestión de Plantillas** (mejora experiencia del agente)
3. **Dashboard Financiero** (visibilidad para gerencia)
4. **Flujo Bot con Aceptación** (automatización completa)

**Recomendación:** Empezar por **Carga de Base de Datos** ya que es bloqueante para las operaciones.
