# 🧪 Suite de Tests - CRM WhatsApp NGSO

## 📋 Índice
- [Tests Automatizados Backend](#tests-automatizados-backend)
- [Tests Manuales Frontend](#tests-manuales-frontend)
- [Checklist Completo](#checklist-completo)

---

## 🤖 Tests Automatizados Backend

### Instalación
```bash
cd backend
npm install axios --save-dev
```

### Ejecución

**Ejecutar todos los tests:**
```bash
node tests/run-all-tests.js
```

**Ejecutar tests individuales:**
```bash
# Solo autenticación
node tests/01-auth-test.js

# Solo usuarios
node tests/02-users-test.js

# Solo campañas
node tests/03-campaigns-test.js

# Solo chats y mensajes
node tests/04-chats-messages-test.js

# Solo bot y flujos
node tests/05-bot-flows-test.js
```

### Módulos Incluidos

#### 1. 🔐 Autenticación (01-auth-test.js)
- ✅ Login Super Admin
- ✅ Login Administrador
- ✅ Login con credenciales incorrectas (debe fallar)
- ✅ Login con email inexistente (debe fallar)
- ✅ Obtener perfil con token válido
- ✅ Acceso sin token (debe fallar)

#### 2. 👥 Usuarios y Agentes (02-users-test.js)
- ✅ Listar usuarios
- ✅ Obtener roles disponibles
- ✅ Crear agente de prueba (a.prueba1@prueba.com)
- ✅ Buscar agente por email
- ✅ Actualizar datos del agente
- ✅ Listar solo agentes
- ✅ Login con agente creado

#### 3. 📢 Campañas (03-campaigns-test.js)
- ✅ Listar campañas
- ✅ Crear campaña de prueba
- ✅ Obtener números WhatsApp disponibles
- ✅ Asignar número a campaña
- ✅ Asignar agente a campaña
- ✅ Obtener detalles de campaña
- ✅ Pausar campaña
- ✅ Reactivar campaña

#### 4. 💬 Chats y Mensajes (04-chats-messages-test.js)
- ✅ Listar chats
- ✅ Obtener detalles de chat
- ✅ Listar mensajes del chat
- ✅ Asignar chat a agente
- ✅ Enviar mensaje en chat
- ✅ Cambiar estado del chat
- ✅ Marcar mensaje como leído
- ✅ Filtrar chats por campaña
- ✅ Filtrar chats por agente

#### 5. 🤖 Bot y Flujos (05-bot-flows-test.js)
- ✅ Listar flujos de bot
- ✅ Crear flujo de prueba
- ✅ Crear nodo inicial
- ✅ Listar nodos del flujo
- ✅ Activar bot en campaña
- ✅ Verificar flujo activo
- ✅ Desactivar bot
- ✅ Verificar asignación de campaña a chat

---

## 🖥️ Tests Manuales Frontend

### Pre-requisitos
- Backend corriendo en https://ngso-chat.assoftware.xyz
- Credenciales de prueba:
  - **Super Admin**: admin@assoftware.xyz / password123
  - **Administrador**: san.alejo0720@gmail.com / password123
  - **Agente**: a.prueba1@prueba.com / password123

---

### 1. 🔐 TEST AUTENTICACIÓN

#### Login
1. Ir a https://172.203.16.202/login
2. Ingresar credenciales de super admin
3. ✅ Verificar redirección a dashboard
4. ✅ Verificar nombre de usuario en header

#### Sesión
5. Refrescar página
6. ✅ Verificar que mantiene sesión
7. Click en perfil → Cerrar sesión
8. ✅ Verificar redirección a login

#### Errores
9. Intentar login con contraseña incorrecta
10. ✅ Verificar mensaje de error
11. Intentar login con email inexistente
12. ✅ Verificar mensaje de error

**✅ PASÓ:** ___  
**❌ FALLÓ:** ___  
**📝 Notas:** _______________

---

### 2. 👥 TEST USUARIOS Y AGENTES

#### Listado
1. Login como admin
2. Ir a Configuración → Usuarios
3. ✅ Verificar que lista usuarios
4. ✅ Verificar filtros (rol, estado)

#### Crear Usuario
5. Click en "Nuevo Usuario"
6. Llenar formulario:
   - Email: test.agente@test.com
   - Nombre: Test Agente
   - Rol: Agente
   - Es Agente: ✓
   - Max Chats: 5
7. Guardar
8. ✅ Verificar usuario creado en lista

#### Editar Usuario
9. Click en editar usuario creado
10. Cambiar Max Chats a 10
11. Guardar
12. ✅ Verificar cambio aplicado

#### Eliminar Usuario
13. Click en eliminar usuario test
14. Confirmar
15. ✅ Verificar usuario eliminado

**✅ PASÓ:** ___  
**❌ FALLÓ:** ___  
**📝 Notas:** _______________

---

### 3. 📢 TEST CAMPAÑAS

#### Crear Campaña
1. Ir a Configuración → Campañas
2. Click "Nueva Campaña"
3. Llenar datos:
   - Nombre: Campaña Test Frontend
   - Descripción: Test manual
   - Estado: Activa
   - Tipo: Cobranza
4. Guardar
5. ✅ Verificar campaña creada

#### Asignar Número WhatsApp
6. Abrir campaña creada
7. Ir a pestaña "WhatsApp"
8. Seleccionar número disponible
9. Guardar
10. ✅ Verificar número asignado

#### Asignar Agentes
11. Ir a pestaña "Agentes"
12. Seleccionar agente (a.prueba1@prueba.com)
13. Agregar
14. ✅ Verificar agente en lista

#### Activar Bot
15. Ir a pestaña "Bot"
16. ✅ Habilitar bot
17. Seleccionar flujo disponible
18. Guardar
19. ✅ Verificar bot activado

**✅ PASÓ:** ___  
**❌ FALLÓ:** ___  
**📝 Notas:** _______________

---

### 4. 💬 TEST CHATS Y MENSAJES

#### Visualizar Chats
1. Ir a panel principal (Chats)
2. ✅ Verificar lista de chats
3. ✅ Verificar estados (open, pending, closed, bot)

#### Filtros
4. Filtrar por campaña
5. ✅ Verificar filtrado correcto
6. Filtrar por agente
7. ✅ Verificar filtrado correcto
8. Filtrar por estado
9. ✅ Verificar filtrado correcto

#### Abrir Chat
10. Click en un chat
11. ✅ Verificar que abre panel derecho
12. ✅ Verificar mensajes se cargan
13. ✅ Verificar información del contacto

#### Enviar Mensaje
14. Escribir mensaje en input
15. Presionar Enter o click en enviar
16. ✅ Verificar mensaje enviado
17. ✅ Verificar mensaje aparece en chat

#### Respuestas Rápidas
18. Click en botón respuestas rápidas
19. Seleccionar una respuesta
20. ✅ Verificar texto insertado
21. Enviar
22. ✅ Verificar mensaje enviado

#### Asignar Chat
23. Chat sin asignar → Click "Asignar"
24. Seleccionar agente
25. Confirmar
26. ✅ Verificar agente asignado
27. ✅ Verificar nombre de agente en chat

#### Cambiar Estado
28. Click en estado del chat
29. Cambiar a "Cerrado"
30. ✅ Verificar estado actualizado
31. ✅ Verificar chat movido a lista de cerrados

**✅ PASÓ:** ___  
**❌ FALLÓ:** ___  
**📝 Notas:** _______________

---

### 5. 🤖 TEST BOT - FLUJO COMPLETO

#### Configurar Bot en Campaña
1. Ir a campaña activa
2. Activar bot
3. Seleccionar "Flujo Cobranza con Validación"
4. Guardar

#### Enviar Mensaje de Prueba desde WhatsApp
5. Enviar mensaje desde WhatsApp al número de la campaña
6. Mensaje: "Hola"

#### Verificar Detección del Bot
7. Ir al panel de chats
8. ✅ Verificar chat aparece con estado "bot"
9. ✅ Verificar campaña asignada automáticamente
10. Abrir el chat
11. ✅ Verificar mensaje del usuario aparece
12. ✅ Verificar respuesta automática del bot

#### Verificar Flujo Completo
13. En WhatsApp, responder "1" (Acepto tratamiento)
14. ✅ Verificar bot solicita documento
15. ✅ Verificar mensaje aparece en frontend

16. Enviar número de documento (ej: "1234567890")
17. ✅ Verificar bot presenta información de deuda
18. ✅ Verificar mensaje aparece en frontend

19. Responder "1" (Quiero hablar con asesor)
20. ✅ Verificar bot transfiere a agente
21. ✅ Verificar estado cambia de "bot" a "pending" o "open"
22. ✅ Verificar chat aparece en cola de agentes

#### Verificar Interrupción Manual
23. Mientras bot está activo, un agente puede intervenir
24. Como agente, asignar chat a sí mismo
25. ✅ Verificar bot se detiene
26. Enviar mensaje manual
27. ✅ Verificar mensaje enviado como agente (no bot)

#### Verificar Reinicio de Bot
28. Cerrar chat
29. Enviar nuevo mensaje desde WhatsApp
30. ✅ Verificar bot inicia desde el principio
31. ✅ Verificar saludo inicial del bot

**✅ PASÓ:** ___  
**❌ FALLÓ:** ___  
**📝 Notas:** _______________

---

### 6. 📊 TEST REPORTES Y DASHBOARDS

#### Dashboard Principal
1. Ir a Dashboard
2. ✅ Verificar estadísticas cargan
3. ✅ Verificar gráficos se muestran
4. ✅ Verificar datos actualizados

#### Filtros de Fecha
5. Cambiar rango de fechas
6. ✅ Verificar datos se actualizan

#### Reportes
7. Ir a Reportes → Mensajes
8. ✅ Verificar tabla de mensajes
9. Exportar a CSV
10. ✅ Verificar archivo descargado

**✅ PASÓ:** ___  
**❌ FALLÓ:** ___  
**📝 Notas:** _______________

---

### 7. 🔔 TEST NOTIFICACIONES EN TIEMPO REAL

#### Socket.IO Connection
1. Abrir DevTools → Console
2. ✅ Verificar conexión Socket.IO establecida
3. ✅ No hay errores de conexión

#### Notificación de Mensaje Nuevo
4. Con chat abierto en frontend
5. Enviar mensaje desde WhatsApp
6. ✅ Verificar mensaje aparece instantáneamente
7. ✅ Sin necesidad de refrescar

#### Notificación de Chat Nuevo
8. Enviar mensaje desde nuevo número
9. ✅ Verificar chat aparece en lista inmediatamente
10. ✅ Contador de chats se actualiza

#### Notificación de Asignación
11. Usuario A asigna chat a Usuario B
12. Usuario B logueado
13. ✅ Verificar Usuario B recibe notificación
14. ✅ Verificar chat aparece en su lista

**✅ PASÓ:** ___  
**❌ FALLÓ:** ___  
**📝 Notas:** _______________

---

### 8. 📱 TEST SESIONES WHATSAPP

#### Ver Sesiones
1. Ir a Configuración → WhatsApp → Sesiones
2. ✅ Verificar lista de números
3. ✅ Verificar estado (connected/disconnected)

#### Desconectar Sesión
4. Click en sesión activa → "Desconectar"
5. ✅ Verificar estado cambia a disconnected

#### Conectar Sesión
6. Click en sesión desconectada → "Conectar"
7. ✅ Verificar QR aparece
8. Escanear QR con WhatsApp
9. ✅ Verificar estado cambia a connected

#### Estado en Tiempo Real
10. Desconectar WhatsApp físicamente
11. ✅ Verificar frontend detecta desconexión
12. ✅ Verificar mensaje de alerta

**✅ PASÓ:** ___  
**❌ FALLÓ:** ___  
**📝 Notas:** _______________

---

## ✅ CHECKLIST COMPLETO DE FUNCIONALIDADES

### Backend Endpoints
- [ ] POST /auth/login
- [ ] GET /auth/profile
- [ ] POST /auth/refresh
- [ ] GET /users
- [ ] POST /users
- [ ] PATCH /users/:id
- [ ] DELETE /users/:id
- [ ] GET /campaigns
- [ ] POST /campaigns
- [ ] PATCH /campaigns/:id
- [ ] DELETE /campaigns/:id
- [ ] POST /campaigns/:id/agents
- [ ] GET /chats
- [ ] GET /chats/:id
- [ ] PATCH /chats/:id
- [ ] PATCH /chats/:id/assign
- [ ] GET /messages
- [ ] POST /messages/send
- [ ] PATCH /messages/:id/read
- [ ] GET /whatsapp/numbers
- [ ] POST /whatsapp/numbers
- [ ] POST /whatsapp/numbers/:id/connect
- [ ] GET /bot/flows
- [ ] POST /bot/flows
- [ ] GET /bot/flows/:id
- [ ] POST /bot/flows/:id/nodes
- [ ] GET /bot/flows/:id/nodes

### Frontend - Funcionalidades
- [ ] Login/Logout
- [ ] Mantener sesión
- [ ] Dashboard principal
- [ ] Lista de chats
- [ ] Filtros de chats
- [ ] Abrir/cerrar chats
- [ ] Enviar mensajes
- [ ] Recibir mensajes en tiempo real
- [ ] Respuestas rápidas
- [ ] Asignar chats
- [ ] Cambiar estado de chats
- [ ] Crear usuarios
- [ ] Editar usuarios
- [ ] Listar usuarios
- [ ] Crear campañas
- [ ] Editar campañas
- [ ] Asignar números a campañas
- [ ] Asignar agentes a campañas
- [ ] Ver flujos de bot
- [ ] Crear flujos de bot
- [ ] Activar/desactivar bot
- [ ] Ver sesiones WhatsApp
- [ ] Conectar/desconectar WhatsApp
- [ ] Ver QR de conexión
- [ ] Reportes y estadísticas
- [ ] Notificaciones en tiempo real
- [ ] Modo agente (vista agente)

### Bot - Funcionalidades
- [ ] Detectar mensaje entrante
- [ ] Asignar chat a campaña correcta
- [ ] Iniciar flujo automáticamente
- [ ] Ejecutar nodos de mensaje
- [ ] Ejecutar nodos de menú
- [ ] Ejecutar nodos de input
- [ ] Ejecutar nodos de condición
- [ ] Transferir a agente
- [ ] Reiniciar flujo al cerrar chat
- [ ] Detener bot cuando agente interviene
- [ ] Guardar contexto de sesión
- [ ] Usar variables en mensajes

---

## 📝 Resultados Finales

**Fecha de Testing:** _______________  
**Testeado por:** _______________  

**Backend:**
- Total tests: ___
- Exitosos: ___
- Fallidos: ___

**Frontend:**
- Módulos probados: ___
- Funcionalidades OK: ___
- Funcionalidades con fallos: ___

**Bot:**
- Flujo completo: ✅ / ❌
- Asignación de campaña: ✅ / ❌
- Transferencia a agente: ✅ / ❌

**Observaciones Generales:**
_______________________________________________________________
_______________________________________________________________
_______________________________________________________________

---

## 🐛 Reporte de Bugs

| ID | Módulo | Descripción | Prioridad | Estado |
|----|--------|-------------|-----------|--------|
| 1  |        |             |           |        |
| 2  |        |             |           |        |
| 3  |        |             |           |        |

---

## 📞 Soporte

Para problemas o dudas sobre los tests:
- **Email**: contacto@as-software.com
- **Documentación**: Ver archivos en `/backend/tests/`

