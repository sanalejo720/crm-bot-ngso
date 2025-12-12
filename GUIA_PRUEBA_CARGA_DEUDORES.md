# 🧪 GUÍA DE PRUEBA - Sistema de Carga de Deudores

**Fecha:** 25 de Noviembre, 2025  
**Desarrollado por:** Alejandro Sandoval - AS Software

---

## ✅ COMPLETADO

### Backend
- ✅ Módulo `debtors` agregado a permisos
- ✅ Permisos especiales: `debtors:upload`, `debtors:import`
- ✅ Endpoint `/debtors/upload` funcionando
- ✅ Cliente de prueba cargado exitosamente

### Frontend
- ✅ Página `/debtors` creada con tabla completa
- ✅ Componente de carga masiva integrado
- ✅ Estadísticas en tiempo real
- ✅ Ruta agregada en App.tsx
- ✅ Enlace en sidebar (Supervisor, Admin, Super Admin)

### Datos de Prueba
- ✅ Cliente cargado: **Alejandro Sandoval**
  - Documento: CC 1061749683
  - Teléfono: 573334309474
  - Deuda: $1.000.000
  - Compañía: Serfinanza
  - Estado: Activo

---

## 🚀 CÓMO PROBAR

### 1. Verificar el Cliente en la Base de Datos

El cliente ya está cargado y listo para ser contactado por WhatsApp.

```bash
cd backend
node cargar-cliente-prueba.js
```

**Resultado esperado:**
```
✅ CLIENTE REGISTRADO EXITOSAMENTE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 Nombre: Alejandro Sandoval
📄 Documento: CC 1061749683
📱 Teléfono: 573334309474
💰 Deuda: $1.000.000
🏢 Compañía: Serfinanza
📊 Estado: active
```

### 2. Acceder al Frontend

1. **Iniciar sesión:**
   ```
   http://localhost:5173/login
   Email: admin@crm.com
   Password: password123
   ```

2. **Navegar a Base de Deudores:**
   - Hacer clic en "Base de Deudores" en el sidebar
   - O ir directamente a: `http://localhost:5173/debtors`

3. **Verificar que aparezca el cliente:**
   - Deberías ver a "Alejandro Sandoval" en la tabla
   - Verificar que muestre: CC 1061749683, teléfono, deuda, etc.

### 3. Probar Carga Masiva desde el Frontend

#### Opción A: Cargar desde Campañas
1. Ir a `/campaigns`
2. Hacer clic en "Cargar Base de Datos"
3. Arrastrar o seleccionar `deudores-prueba-real.csv`
4. Ver reporte de carga

#### Opción B: Cargar desde Base de Deudores
1. Ir a `/debtors`
2. Hacer clic en "Cargar Base de Datos" (botón morado)
3. Arrastrar o seleccionar archivo CSV/Excel
4. Ver reporte detallado con estadísticas

### 4. Validar Integración con WhatsApp

1. **Escribir desde WhatsApp:**
   - Enviar un mensaje desde: **573334309474**
   - El sistema debería reconocer automáticamente al cliente

2. **Verificar en el panel:**
   - El chat debería mostrar información del deudor
   - Deuda: $1.000.000
   - Compañía: Serfinanza

---

## 📋 ARCHIVOS PARA PRUEBA

### 1. Cliente Individual (Ya cargado)
```
backend/deudores-prueba-real.csv
```

### 2. Plantilla con 5 Clientes
```
backend/deudores-plantilla.csv
```

### 3. Descargar Plantilla desde el Frontend
1. Abrir diálogo de carga
2. Hacer clic en "Descargar Plantilla CSV"
3. Editar con tus datos
4. Cargar de vuelta

---

## 🎯 FUNCIONALIDADES A VALIDAR

### En la Página de Deudores (/debtors)

- [ ] **Estadísticas en tiempo real:**
  - Total de deudores
  - Deuda total acumulada
  - Promedio de días de mora
  - Cantidad con teléfono

- [ ] **Búsqueda:**
  - Por nombre
  - Por documento
  - Por teléfono

- [ ] **Tabla paginada:**
  - 25 registros por página
  - Cambiar cantidad de filas
  - Navegación entre páginas

- [ ] **Botón "Cargar Base de Datos":**
  - Abrir diálogo de carga
  - Validación de archivos
  - Progreso en tiempo real
  - Reporte detallado

### En el Diálogo de Carga

- [ ] **Drag & Drop:**
  - Arrastrar archivo CSV
  - Arrastrar archivo Excel
  - Validación de formato

- [ ] **Validaciones:**
  - Solo CSV/Excel
  - Máximo 10MB
  - Feedback visual

- [ ] **Progreso:**
  - Barra de progreso
  - Porcentaje de carga

- [ ] **Reporte:**
  - Total de filas
  - Creados/Actualizados/Fallidos
  - Deuda total
  - Mora promedio
  - Distribución por tipo de documento
  - Lista de errores (si hay)

---

## 🔍 ENDPOINTS API PARA VALIDAR

### 1. Listar Deudores
```bash
GET http://localhost:3000/api/v1/debtors?page=1&limit=25
Authorization: Bearer {token}
```

### 2. Buscar por Documento
```bash
GET http://localhost:3000/api/v1/debtors/search/CC/1061749683
Authorization: Bearer {token}
```

### 3. Buscar por Teléfono
```bash
GET http://localhost:3000/api/v1/debtors/phone/573334309474
Authorization: Bearer {token}
```

### 4. Cargar Archivo
```bash
POST http://localhost:3000/api/v1/debtors/upload
Authorization: Bearer {token}
Content-Type: multipart/form-data

file: [archivo.csv o archivo.xlsx]
```

---

## 📊 CASOS DE PRUEBA

### Caso 1: Carga Exitosa
**Archivo:** `deudores-plantilla.csv` (5 registros)  
**Resultado Esperado:**
- 5 filas procesadas
- Duplicados detectados y actualizados
- Reporte con estadísticas

### Caso 2: Cliente Duplicado
**Acción:** Cargar `deudores-prueba-real.csv` dos veces  
**Resultado Esperado:**
- Primera vez: 1 creado
- Segunda vez: 1 actualizado

### Caso 3: Archivo con Errores
**Crear archivo con:**
- Fila sin nombre
- Fila sin documento
- Tipo de documento inválido

**Resultado Esperado:**
- Filas válidas procesadas
- Errores listados con detalles
- Proceso completo sin crash

### Caso 4: Formato Excel
**Archivo:** Convertir CSV a .xlsx  
**Resultado Esperado:**
- Parseo correcto
- Mismos resultados que CSV

---

## 🎨 INTERFAZ ESPERADA

### Página de Deudores
```
┌─────────────────────────────────────────────────────┐
│  Base de Datos de Deudores                          │
│  Gestiona la cartera de clientes y carga masiva    │
│                                    [🔄] [Cargar BD] │
├─────────────────────────────────────────────────────┤
│  ℹ️  Carga archivos CSV o Excel...                  │
├─────────────────────────────────────────────────────┤
│  [📊 Total: 6]  [💰 Deuda: $13.650.000]            │
│  [📅 Mora: 45 días]  [📞 Con Teléfono: 6]          │
├─────────────────────────────────────────────────────┤
│  [🔍 Buscar...]                                     │
├─────────────────────────────────────────────────────┤
│  Nombre    │ Documento │ Teléfono │ Compañía │ ... │
│  Alejandro │ CC 1061.. │ 573334.. │ Serfinan │ ... │
│  ...                                                 │
└─────────────────────────────────────────────────────┘
```

### Diálogo de Carga
```
┌─────────────────────────────────────────────┐
│  Cargar Base de Datos                  [❌] │
├─────────────────────────────────────────────┤
│  ℹ️  Sube un archivo CSV o Excel...         │
│  [📥 Descargar Plantilla CSV]              │
├─────────────────────────────────────────────┤
│  ┌───────────────────────────────────────┐  │
│  │    📁 Arrastra un archivo aquí       │  │
│  │    o haz clic para seleccionar       │  │
│  │    CSV, Excel (.xlsx, .xls)          │  │
│  └───────────────────────────────────────┘  │
├─────────────────────────────────────────────┤
│              [Cancelar] [⬆️ Cargar]         │
└─────────────────────────────────────────────┘
```

---

## ✅ CHECKLIST FINAL

### Backend
- [x] Módulo debtors en permisos
- [x] Endpoint de carga funcionando
- [x] Parser CSV funcionando
- [x] Parser Excel funcionando
- [x] Validaciones implementadas
- [x] Cliente de prueba cargado

### Frontend
- [x] Página de deudores creada
- [x] Ruta configurada en App.tsx
- [x] Enlace en sidebar
- [x] Componente de carga integrado
- [x] Estadísticas visibles
- [x] Tabla con paginación
- [x] Búsqueda funcionando

### Integración
- [x] Permisos asignados a Super Admin
- [x] Datos de prueba listos
- [x] Scripts de carga disponibles
- [ ] Prueba end-to-end desde frontend
- [ ] Validación con WhatsApp real

---

## 🚨 TROUBLESHOOTING

### Error: "Unauthorized" al cargar
**Solución:** 
1. Hacer logout
2. Login nuevamente
3. Intentar de nuevo

### No aparece el enlace en el sidebar
**Solución:**
1. Verificar que tu usuario sea Supervisor, Admin o Super Admin
2. Refrescar la página
3. Limpiar caché del navegador

### El archivo no se carga
**Solución:**
1. Verificar que sea CSV o Excel
2. Verificar que sea menor a 10MB
3. Verificar que tenga las columnas requeridas:
   - nombre
   - tipo_doc
   - documento

---

## 📞 SIGUIENTE PASO

Una vez validado el sistema de carga:

1. **Probar con el chat real de WhatsApp (573334309474)**
2. **Verificar que el sistema reconozca al cliente automáticamente**
3. **Validar que muestre la información de deuda en el panel**

---

**Desarrollado con ❤️ por AS Software**  
**NGS&O CRM Gestión v1.0**
