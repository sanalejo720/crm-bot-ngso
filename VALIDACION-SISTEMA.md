# Scripts de Validación del Sistema CRM

Este documento describe los scripts de validación completa del sistema CRM para garantizar que todos los módulos, dashboards y funcionalidades estén operando correctamente con datos precisos y en tiempo real.

## 📋 Módulos Validados

Los scripts validan exhaustivamente los siguientes componentes:

### 1. **Dashboard Principal**
- ✓ Estadísticas generales (chats, deudores, actividad)
- ✓ Gráficos de chats por estado
- ✓ Actividad reciente
- ✓ Consistencia de datos numéricos

### 2. **Dashboard Financiero**
- ✓ Totales financieros (deuda, pagado, pendiente)
- ✓ Coherencia de cálculos financieros
- ✓ Pagos por mes
- ✓ Top deudores

### 3. **Gestión de Chats**
- ✓ Listado de chats con paginación
- ✓ Estructura de datos completa
- ✓ Formato de fechas
- ✓ Estados disponibles
- ✓ Filtros funcionales

### 4. **Plantillas de Mensajes**
- ✓ Listado de plantillas
- ✓ Estructura de datos (name, content, type)
- ✓ Detección de variables {{variable}}

### 5. **Evidencias de Pago**
- ✓ Listado con paginación
- ✓ Campos requeridos (debtorId, filePath, status)
- ✓ Estados válidos (pending, approved, rejected)

### 6. **PDFs de Cierre**
- ✓ Listado de PDFs generados
- ✓ Validación de rutas de archivo
- ✓ Extensiones correctas (.pdf)

### 7. **Promesas de Pago**
- ✓ Listado de promesas
- ✓ Validación de fechas
- ✓ Detección de promesas vencidas
- ✓ Validación de montos

### 8. **Clientes No Identificados**
- ✓ Listado de clientes sin identificar
- ✓ Datos básicos presentes
- ✓ Alertas si hay muchos sin identificar

### 9. **Sistema de Reportes**
- ✓ Reporte de gestión
- ✓ Reporte de productividad
- ✓ Reporte financiero
- ✓ Generación correcta de datos

### 10. **Campañas**
- ✓ Listado de campañas
- ✓ Estructura de datos
- ✓ Estadísticas por campaña
- ✓ Estados de envío/entrega

### 11. **Base de Deudores**
- ✓ Listado con paginación
- ✓ Campos críticos (name, phone, debtAmount)
- ✓ Validación de montos
- ✓ Detección de duplicados
- ✓ Estadísticas generales

### 12. **Flujos de Bot**
- ✓ Listado de flujos configurados
- ✓ Estructura de pasos
- ✓ Validación de acciones y mensajes
- ✓ Estados activo/inactivo

### 13. **Números de WhatsApp**
- ✓ Sesiones configuradas
- ✓ Estado de conexión (CONNECTED/DISCONNECTED)
- ✓ Información de números
- ✓ Estado del servicio

### 14. **Monitoreo de Sesiones de Agentes**
- ✓ Jornadas activas
- ✓ Cálculo de tiempos (trabajo, pausa, productivo)
- ✓ Coherencia de cálculos
- ✓ Información de usuarios (fullName)
- ✓ Estados de agentes

### 15. **Usuarios**
- ✓ Listado de usuarios
- ✓ Estructura de datos
- ✓ Roles asignados
- ✓ Distribución por rol
- ✓ Usuarios activos/inactivos

### 16. **Roles y Permisos**
- ✓ Listado de roles
- ✓ Permisos asignados por rol
- ✓ Permisos disponibles en el sistema
- ✓ Documentación de permisos

### 17. **Sistema de Backup**
- ✓ Backups disponibles
- ✓ Frecuencia de backup
- ✓ Tamaño de backups
- ✓ Configuración de backup automático

### 18. **Validación de Caché**
- ✓ Headers de caché en respuestas
- ✓ Consistencia de datos
- ✓ Verificación de datos frescos vs cacheados

---

## 🚀 Scripts Disponibles

### 1. **validate-all-features.js** (Desarrollo Local)

Script completo para validar todos los módulos en entorno de desarrollo local.

**Uso:**
```bash
cd backend
node validate-all-features.js
```

**Características:**
- Valida contra `http://localhost:3000/api`
- Múltiples roles (admin, agent, supervisor)
- Genera reporte JSON detallado
- Colorización de salida en consola

**Requisitos:**
- Backend corriendo localmente en puerto 3000
- Credenciales configuradas en el script
- Paquetes: `axios`, `chalk`

---

### 2. **validate-production.js** (Producción)

Script optimizado para validar el sistema en producción.

**Uso:**
```bash
node validate-production.js
```

**Características:**
- Valida contra `https://72.61.73.9:3000/api`
- Ignora certificados SSL autofirmados
- Timeout de 10 segundos por request
- Reporte simplificado pero completo

**Requisitos:**
- Acceso al servidor de producción
- Credenciales válidas configuradas
- Paquetes: `axios`, `chalk`

---

## 📊 Interpretación de Resultados

### Códigos de Estado

- **✓ (Verde)**: Test pasado correctamente
- **✗ (Rojo)**: Test fallido - requiere atención
- **⚠ (Amarillo)**: Advertencia - funcional pero con observaciones

### Ejemplo de Salida

```
============================================================
DASHBOARD PRINCIPAL
============================================================
✓ Dashboard Stats: Chats: 145, Deudores: 230
✓ Validación de datos: Números consistentes
✓ Chats por estado: 4 estados encontrados
✓ Actividad reciente: 12 eventos recientes

============================================================
REPORTE FINAL
============================================================
ℹ Total de pruebas ejecutadas: 87
✓ Pruebas exitosas: 82
✗ Pruebas fallidas: 5
⚠ Advertencias: 8

ℹ Tasa de éxito: 94.25%
```

### Archivo de Reporte

Los scripts generan un archivo JSON con todos los detalles:

```json
{
  "passed": 82,
  "failed": 5,
  "warnings": 8,
  "tests": [
    {
      "module": "Dashboard",
      "test": "Stats generales",
      "passed": true,
      "message": "Stats obtenidos correctamente",
      "data": {
        "totalChats": 145,
        "activeChats": 67,
        "totalDebtors": 230
      },
      "timestamp": "2025-12-02T10:30:45.123Z"
    }
  ]
}
```

---

## 🔍 Validaciones Específicas

### Datos en Tiempo Real

Los scripts verifican que:
- ✓ No hay datos cacheados obsoletos
- ✓ Los cálculos se realizan en tiempo real
- ✓ Las fechas están correctamente formateadas
- ✓ Los tiempos de jornada se actualizan continuamente

### Coherencia de Datos

Validaciones críticas:
- Total de chats activos ≤ Total de chats
- Deuda pendiente = Deuda total - Deuda pagada
- Tiempo productivo = Tiempo trabajo - Tiempo pausa
- Suma de estados = Total de registros

### Integridad de Datos

Campos requeridos verificados:
- Chats: id, phoneNumber, status, lastMessage
- Deudores: id, name, phone, debtAmount
- Usuarios: id, email, role, fullName
- Jornadas: id, userId, clockInTime, totalWorkMinutes

---

## ⚙️ Configuración

### Credenciales

Editar en el script antes de ejecutar:

```javascript
const CREDENTIALS = {
  admin: { email: 'admin@crm.com', password: 'admin123' },
  agent: { email: 'a.prueba1@prueba.com', password: 'Prueba123!' },
  supervisor: { email: 'supervisor@crm.com', password: 'super123' }
};
```

### URL de API

**Desarrollo:**
```javascript
const API_URL = 'http://localhost:3000/api';
```

**Producción:**
```javascript
const API_URL = 'https://72.61.73.9:3000/api';
```

---

## 🛠️ Instalación de Dependencias

```bash
npm install axios chalk
```

---

## 📝 Casos de Uso

### 1. Validación Pre-Deploy

Antes de desplegar a producción:
```bash
# Validar localmente
node backend/validate-all-features.js

# Revisar reporte
cat validation-report-*.json
```

### 2. Verificación Post-Deploy

Después de desplegar:
```bash
# Validar producción
node validate-production.js

# Verificar tasa de éxito >= 95%
```

### 3. Monitoreo Periódico

Configurar cron job para ejecutar diariamente:
```bash
# Cada día a las 2 AM
0 2 * * * cd /path/to/crm && node validate-production.js >> logs/validation.log 2>&1
```

### 4. Debugging de Problemas

Si un módulo falla:
1. Ejecutar script completo
2. Revisar sección específica en el reporte
3. Verificar logs del backend
4. Corregir y re-validar

---

## 🚨 Alertas Críticas

Los scripts detectan problemas críticos como:

- ❌ **Datos negativos**: Chats, deudores, montos negativos
- ❌ **Fechas inválidas**: "Invalid Date" o timestamps incorrectos
- ❌ **Campos faltantes**: Campos requeridos ausentes
- ❌ **Cálculos incorrectos**: Totales que no cuadran
- ❌ **Sesiones desconectadas**: WhatsApp sin conexión
- ❌ **Backups antiguos**: Más de 7 días sin backup
- ❌ **Usuarios sin rol**: Usuarios sin permisos asignados

---

## 📈 Métricas de Calidad

### Tasa de Éxito Esperada

- **Excelente**: ≥ 95% - Sistema completamente funcional
- **Bueno**: 85-94% - Sistema funcional con mejoras menores
- **Aceptable**: 75-84% - Requiere atención en algunas áreas
- **Crítico**: < 75% - Problemas graves que requieren solución inmediata

### KPIs Monitoreados

1. **Disponibilidad**: % de endpoints respondiendo correctamente
2. **Integridad**: % de datos con estructura correcta
3. **Coherencia**: % de cálculos correctos
4. **Actualidad**: % de datos en tiempo real (no cacheados)

---

## 🔄 Frecuencia Recomendada

- **Pre-deploy**: Siempre antes de desplegar
- **Post-deploy**: Inmediatamente después de desplegar
- **Diario**: Validación automática cada madrugada
- **Semanal**: Revisión manual del reporte completo
- **Mensual**: Auditoría profunda de todos los módulos

---

## 📞 Soporte

Para problemas con los scripts:
1. Verificar que el backend esté corriendo
2. Revisar credenciales de acceso
3. Verificar conectividad de red
4. Revisar logs del servidor
5. Contactar al equipo de desarrollo

---

## 🔐 Seguridad

**Importante**: Nunca commitear credenciales reales al repositorio.

- Usar variables de entorno para credenciales en producción
- Rotar contraseñas regularmente
- Limitar acceso a los scripts de validación
- Cifrar reportes si contienen datos sensibles

---

## 🎯 Conclusión

Estos scripts garantizan que:
- ✅ Todos los módulos funcionan correctamente
- ✅ Los datos son precisos y actuales
- ✅ No hay información cacheada obsoleta
- ✅ Los cálculos en tiempo real son correctos
- ✅ La integridad del sistema está preservada

Ejecutar regularmente para mantener la calidad del sistema CRM.
