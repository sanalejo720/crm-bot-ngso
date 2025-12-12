# ✅ CHECKLIST FINAL - ENTREGA DE PRUEBAS

## 🎯 ARCHIVOS MODIFICADOS (Listos para subir al servidor)

### 1. bot-engine.service.ts ✅
- **Ruta**: `backend/src/modules/bot/bot-engine.service.ts`
- **Cambios**:
  - ✅ Normalización de teléfonos (líneas 651-673)
  - ✅ Valores por defecto cuando no hay deudor (líneas 68-88)
  - ✅ replaceVariables mejorado (líneas 613-645)
  
### 2. bot-listener.service.ts ✅
- **Ruta**: `backend/src/modules/bot/bot-listener.service.ts`
- **Cambios**:
  - ✅ Normalización de teléfonos (líneas 101-118)
  - ✅ Búsqueda con fallback (busca normalizado y original)

---

## 📊 DATOS DE PRUEBA DISPONIBLES

### Deudores Creados: 4

| Nombre | Teléfono | Documento | Deuda |
|--------|----------|-----------|-------|
| Carlos Ramírez | 14695720206 | CC 79876543 | $3,200,000 |
| María González | 573001234567 | CC 52345678 | $1,800,000 |
| **Alejandro Sandoval** | **3334309474** | **CC 1061749683** | **$3,659,864** |
| Juan Perez | 3001234567 | CC 1234567890 | $1,500,000 |

**Chat Activo**: 573334309474@c.us → **Coincide con Alejandro Sandoval** ✅

---

## 🚀 PASOS PARA DESPLEGAR

### A. Subir Archivos al Servidor

#### Opción 1: Git Push (RECOMENDADO)
```bash
# En tu PC:
cd D:\crm-ngso-whatsapp
git add backend/src/modules/bot/bot-engine.service.ts
git add backend/src/modules/bot/bot-listener.service.ts
git commit -m "Fix: Normalización de teléfonos para búsqueda de deudores"
git push origin feature/mejoras-crm-bot

# En el servidor (SSH):
cd /ruta/del/backend
git pull origin feature/mejoras-crm-bot
npm run build
pm2 restart ngso-crm-backend
```

#### Opción 2: Subir manualmente por FTP/SFTP
1. Conectar a: 172.203.16.202
2. Subir:
   - `bot-engine.service.ts` → `/backend/src/modules/bot/`
   - `bot-listener.service.ts` → `/backend/src/modules/bot/`
3. Ejecutar en servidor:
```bash
cd /ruta/del/backend
npm run build
pm2 restart ngso-crm-backend
```

---

## ✅ PRUEBAS A REALIZAR

### 1. Verificar Backend Reiniciado

```bash
# En servidor o localmente:
curl https://ngso-chat.assoftware.xyz/api/v1/health
# Debe responder: {"status":"ok"}
```

### 2. Verificar Deudores en Frontend

**URL**: https://172.203.16.202/debtors

**Resultado Esperado**:
- [ ] Muestra 4 deudores
- [ ] Aparece "Carlos Ramírez Sánchez"
- [ ] Aparece "Alejandro Sandoval"

**Si NO aparecen**:
- Abrir consola del navegador (F12 → Console)
- Buscar errores de JavaScript
- Verificar que el endpoint responde correctamente

### 3. Probar Bot con Deudor Existente

**Teléfono**: 573334309474 (Alejandro Sandoval)

**Pasos**:
1. [ ] Enviar mensaje de WhatsApp desde ese número
2. [ ] Bot debe responder con datos reales

**Respuesta Esperada**:
```
¡Perfecto! Encontré tu información.

DATOS DE TU CUENTA:

👤 Nombre: Alejandro Sandoval
🆔 Documento: CC 1061749683
📦 Producto: Crédito de Libranza
💰 Deuda Total: $3,659,864
⏰ Días de Mora: 45 días
📅 Fecha de Vencimiento: 2024-10-15

Para resolver esta situación, puedes:

1️⃣ Pagar ahora
2️⃣ Acordar fecha de pago
3️⃣ Hablar con un asesor

Por favor, responde con el número de tu opción.
```

### 4. Probar Bot con Número NO Registrado

**Teléfono**: Cualquier otro número

**Respuesta Esperada**:
```
¡Hola! Bienvenido.

DATOS DE TU CUENTA:

👤 Nombre: [No encontrado]
🆔 Documento: [Desconocido]
📦 Producto: [No disponible]
💰 Deuda Total: $0
```

### 5. Verificar Chat en Sistema

**URL**: https://172.203.16.202/all-chats

- [ ] El chat 573334309474 aparece en la lista
- [ ] Estado: "Activo" o "Bot"
- [ ] Última actividad: menos de 1 hora
- [ ] Campaña: Asignada

---

## 🐛 SOLUCIÓN DE PROBLEMAS

### Problema 1: Frontend no muestra deudores

**Síntoma**: Página /debtors dice "No se encontraron deudores"

**Verificar**:
```bash
# Test manual del API:
curl -H "Authorization: Bearer [TU_TOKEN]" \
  https://ngso-chat.assoftware.xyz/api/v1/debtors

# Debe devolver JSON con 4 deudores
```

**Causa probable**: Frontend espera estructura incorrecta

**Solución**: 
1. Verificar consola del navegador (F12)
2. Si hay error de CORS, verificar que el backend permite el origen
3. Si no hay error, el problema es la estructura de datos

### Problema 2: Bot no encuentra al deudor

**Síntoma**: Bot responde con [No encontrado] para número registrado

**Verificar logs del backend**:
```bash
pm2 logs ngso-crm-backend | grep "Buscando deudor"
```

**Debe mostrar**:
```
🔍 Buscando deudor - Tel original: 573334309474@c.us, Normalizado: 3334309474
✅ Deudor encontrado: Alejandro Sandoval
```

**Si no aparece**: Backend no se reinició o cambios no se aplicaron

### Problema 3: Backend no responde

**Verificar estado**:
```bash
pm2 status
pm2 logs ngso-crm-backend --lines 50
```

**Reiniciar**:
```bash
pm2 restart ngso-crm-backend
pm2 logs ngso-crm-backend
```

---

## 📈 RESULTADOS DE TESTS AUTOMATIZADOS

```
══════════════════════════════════════════════════════════════
📊 RESUMEN GENERAL DE TESTS
══════════════════════════════════════════════════════════════

📋 Por Módulo:
   🔐 Autenticación:      5/6 exitosos (83.3%)
   👥 Usuarios:           6/6 exitosos (100.0%) ✅
   📢 Campañas:           5/6 exitosos (83.3%)
   💬 Chats/Mensajes:     5/5 exitosos (100.0%) ✅
   🤖 Bot/Flujos:         7/7 exitosos (100.0%) ✅

──────────────────────────────────────────────────────────────
   TOTAL TESTS:           30
   ✅ EXITOSOS:           28
   ❌ FALLIDOS:           2 (no críticos)
   📈 PORCENTAJE:         93.3%
══════════════════════════════════════════════════════════════
```

---

## ✨ DEMOSTRACIÓN VISUAL

### Antes (Con Problema):
![Imagen del chat mostrando {{debtor.fullName}}, {{debtor.documentType}}, etc.]

### Después (Corregido):
![Imagen del chat mostrando datos reales o [No encontrado]]

---

## 📞 CONTACTO EN CASO DE PROBLEMAS

**Archivos importantes**:
- `ENTREGA_HOY_CAMBIOS_CRITICOS.md` - Documento completo
- `bot-engine.service.ts` - Servicio principal del bot
- `bot-listener.service.ts` - Listener de mensajes
- `check-debtors-api.js` - Script para verificar deudores
- `sync-chat-debtor.js` - Script para sincronizar chat

**Scripts útiles**:
```bash
# Ver deudores
node backend/check-debtors-api.js

# Ejecutar tests
node backend/tests/run-all-tests.js

# Crear más deudores
node backend/create-test-debtors-api.js

# Verificar sincronización
node backend/sync-chat-debtor.js
```

---

## 🎯 ESTADO FINAL

- ✅ Código corregido y probado localmente
- ✅ Tests pasando al 93.3%
- ✅ 4 deudores de prueba creados
- ✅ Chat existente sincronizado con deudor
- ✅ Normalización de teléfonos implementada
- ✅ Documentación completa

**LISTO PARA DESPLEGAR** 🚀

**Tiempo estimado**: 10-15 minutos (subir archivos + reiniciar)

---

**Última actualización**: 1 de Diciembre, 2025 - 11:15 AM
**Versión**: 2.0 - Con normalización de teléfonos
