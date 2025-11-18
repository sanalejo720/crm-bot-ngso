# 🗂️ ÍNDICE RÁPIDO - SCRIPTS DE TESTING

## 📍 Ubicación de Archivos

```
D:\crm-ngso-whatsapp\
│
├── backend\scripts\
│   ├── 🔐 test-auth.ps1              → Autenticación (8 tests)
│   ├── 📢 test-campaigns.ps1         → Campañas (13 tests)
│   ├── 💬 test-chats.ps1             → Chats (10 tests)
│   ├── 📨 test-messages.ps1          → Mensajes (10 tests)
│   ├── 📊 test-reports.ps1           → Reportes (8 tests)
│   ├── 👥 test-users.ps1             → Usuarios (13 tests)
│   ├── 🔄 test-flow-complete.ps1     → Flujo completo (12 pasos)
│   ├── 🎯 test-all.ps1               → Suite completa (todos)
│   ├── ⚡ demo-quick.ps1             → Demo rápida (5 min)
│   └── 📖 README.md                  → Documentación scripts
│
├── frontend\tests\
│   ├── 🌐 api-tests.js               → Tests de API (navegador)
│   └── 🔌 socket-tests.js            → Tests de WebSocket (navegador)
│
├── 📚 TESTING_GUIDE.md               → Guía completa de testing
└── 📋 SCRIPTS_TESTING_RESUMEN.md     → Resumen y casos de uso
```

---

## ⚡ Comandos Rápidos

### Backend - PowerShell

```powershell
# Navegar al directorio
cd D:\crm-ngso-whatsapp\backend\scripts

# Demo rápida (recomendado para empezar) ⭐
.\demo-quick.ps1

# Suite completa (todos los módulos)
.\test-all.ps1

# Flujo completo de atención
.\test-flow-complete.ps1

# Tests individuales
.\test-auth.ps1
.\test-chats.ps1
.\test-messages.ps1
```

### Frontend - JavaScript (Navegador)

```javascript
// 1. Abrir http://localhost:5173
// 2. F12 → Console
// 3. Copiar script de D:\crm-ngso-whatsapp\frontend\tests\api-tests.js
// 4. Ejecutar:
runAllTests()

// Para WebSocket (en /workspace):
// Copiar socket-tests.js y ejecutar:
runSocketTests()
```

---

## 🎯 Escenarios Comunes

### "Quiero probar todo rápido"
```powershell
cd D:\crm-ngso-whatsapp\backend\scripts
.\demo-quick.ps1
```
⏱️ Duración: ~2 minutos  
✅ Muestra: Login, chats, mensajes, estadísticas

---

### "Necesito validar todos los endpoints"
```powershell
cd D:\crm-ngso-whatsapp\backend\scripts
.\test-all.ps1
```
⏱️ Duración: ~3 minutos  
✅ Ejecuta: 62 tests en 6 módulos

---

### "Quiero simular un flujo real"
```powershell
cd D:\crm-ngso-whatsapp\backend\scripts
.\test-flow-complete.ps1
```
⏱️ Duración: ~40 segundos  
✅ Simula: Chat nuevo → Asignación → Conversación → Cierre

---

### "Solo quiero probar un módulo"
```powershell
cd D:\crm-ngso-whatsapp\backend\scripts

# Autenticación
.\test-auth.ps1

# Chats
.\test-chats.ps1

# Mensajes
.\test-messages.ps1

# Usuarios
.\test-users.ps1

# Campañas
.\test-campaigns.ps1

# Reportes
.\test-reports.ps1
```

---

## 📊 Matriz de Cobertura

| Módulo | Script | Tests | Endpoints | Duración |
|--------|--------|-------|-----------|----------|
| Auth | test-auth.ps1 | 8 | 5 | ~20s |
| Campaigns | test-campaigns.ps1 | 13 | 10 | ~35s |
| Chats | test-chats.ps1 | 10 | 7 | ~30s |
| Messages | test-messages.ps1 | 10 | 3 | ~25s |
| Reports | test-reports.ps1 | 8 | 4 | ~20s |
| Users | test-users.ps1 | 13 | 10 | ~35s |
| **TOTAL** | **test-all.ps1** | **62** | **39** | **~3m** |

---

## 🎬 Orden Recomendado (Primera Vez)

1. **Demo Rápida** - `demo-quick.ps1`
   - Ver cómo funcionan los scripts
   - Entender el formato de salida
   - Verificar que todo esté configurado

2. **Test de Autenticación** - `test-auth.ps1`
   - Validar login/logout
   - Verificar tokens
   - Comprobar usuarios

3. **Flujo Completo** - `test-flow-complete.ps1`
   - Ver un caso de uso real
   - Entender el flujo de trabajo
   - Validar integración

4. **Suite Completa** - `test-all.ps1`
   - Ejecutar todos los tests
   - Obtener reporte completo
   - Validar sistema completo

---

## 🔍 Tabla de Búsqueda Rápida

| Quiero probar... | Usar script... |
|------------------|----------------|
| Login/Logout | test-auth.ps1 |
| Crear campaña | test-campaigns.ps1 |
| Crear chat | test-chats.ps1 |
| Enviar mensaje | test-messages.ps1 |
| Ver estadísticas | test-reports.ps1 |
| Gestionar usuarios | test-users.ps1 |
| Todo junto | test-all.ps1 |
| Flujo real | test-flow-complete.ps1 |
| Demo rápida | demo-quick.ps1 |

---

## 📖 Documentación Completa

| Documento | Contenido |
|-----------|-----------|
| `backend/scripts/README.md` | Detalles técnicos de cada script |
| `TESTING_GUIDE.md` | Guía completa de testing |
| `SCRIPTS_TESTING_RESUMEN.md` | Resumen y casos de uso |
| Este archivo | Índice y comandos rápidos |

---

## 🚦 Prerequisitos

Antes de ejecutar los scripts, verificar:

```powershell
# 1. Backend corriendo
Get-Process node | Where-Object {$_.Path -like "*backend*"}

# 2. Puerto 3000 disponible
Test-NetConnection -ComputerName localhost -Port 3000

# 3. Base de datos conectada
psql -U postgres -d ngso_crm -c "SELECT COUNT(*) FROM users;"
```

Si algo falla:
```powershell
# Iniciar backend
cd D:\crm-ngso-whatsapp\backend
npm run start:dev

# Verificar frontend (opcional para tests backend)
cd D:\crm-ngso-whatsapp\frontend
npm run dev
```

---

## 💡 Tips

### Guardar Resultados
```powershell
.\test-all.ps1 > test-results.txt
```

### Ejecutar en Modo Verbose
```powershell
.\test-chats.ps1 -Verbose
```

### Ejecutar Solo en Errores
```powershell
.\test-all.ps1 2> errors.txt
```

### Medir Tiempo de Ejecución
```powershell
Measure-Command { .\test-all.ps1 }
```

---

## 🎨 Leyenda de Colores

En los scripts verás estos colores:

| Color | Significado | Ejemplo |
|-------|-------------|---------|
| 🟢 Verde | Éxito | `✅ Test pasó` |
| 🔴 Rojo | Error | `❌ Test falló` |
| 🟡 Amarillo | Advertencia | `⚠️ Timeout` |
| 🔵 Azul/Cyan | Información | `ℹ️ Procesando...` |
| 🟣 Magenta | Sección | `══════════` |

---

## 🆘 Problemas Comunes

### "Backend no disponible"
```powershell
cd D:\crm-ngso-whatsapp\backend
npm run start:dev
```

### "Error de autenticación"
```powershell
cd D:\crm-ngso-whatsapp\backend
psql -U postgres -d ngso_crm -f scripts/reset-passwords.sql
```

### "IDs de campaña/whatsapp no existen"
```powershell
# Verificar en base de datos
psql -U postgres -d ngso_crm -c "SELECT id, name FROM campaigns;"
psql -U postgres -d ngso_crm -c "SELECT id, phone_number FROM whatsapp_numbers;"

# Actualizar IDs en los scripts si es necesario
```

---

## 📞 Contacto

**Desarrollador:** Alejandro Sandoval - AS Software  
**Proyecto:** NGS&O CRM Gestión  
**Fecha:** Noviembre 2024

---

## ✨ ¡Empieza Aquí!

```powershell
# Copia y pega esto en PowerShell:

cd D:\crm-ngso-whatsapp\backend\scripts
.\demo-quick.ps1
```

**¡Eso es todo! El resto lo descubrirás explorando los scripts.** 🚀
