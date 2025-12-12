# 🚀 Implementación de Mejoras – CRM WhatsApp Bot (Twilio + Campañas)

Quiero que actúes como:

- Arquitecto de software senior
- Desarrollador full-stack (backend + frontend)
- Ingeniero de datos
- Especialista en CRMs de call center y bots de WhatsApp/SMS (Twilio)
- QA líder para validación funcional y técnica

Tu misión es **analizar el sistema actual** y **diseñar/implementar las siguientes mejoras**, revisando **BD, backend, frontend, endpoints, flujos y métricas**, como si fuera una entrega profesional lista para producción.

---

## 1️⃣ Base de datos por campaña

### Requisito:
1. Cada **campaña** debe tener su **propia base de datos de clientes/cartera** o al menos estar claramente segmentada por `campaign_id`.

### Lo que quiero que hagas:
- Diseñar/ajustar el modelo de datos para que:
  - Cada cliente tenga un campo `campaign_id` (o tabla intermedia clara).
  - Se puedan cargar bases de datos **por campaña**, no de forma global.
- Validar:
  - Estructura en la BD (tablas, relaciones, índices).
  - Endpoints de carga de base de datos.
  - Formularios/pantallas del frontend para seleccionar campaña al cargar datos.

---

## 2️⃣ Detección de campaña según documento y enrutamiento por campaña

### Requisito:
2. El **bot debe detectar**, cuando el cliente ingrese su documento:
   - A qué **campaña** pertenece ese cliente.
   - Solo asignar el chat a los **asesores asociados a esa campaña**.

### Lo que quiero que hagas:
- Revisar la lógica actual donde el bot valida el documento del cliente.
- Implementar la lógica:
  - `documento → búsqueda en BD → campaign_id → asignar solo a agentes de esa campaña`.
- Verificar que:
  - El bot use correctamente `campaign_id` al crear el chat.
  - La lógica de asignación de agentes respete siempre la campaña.

---

## 3️⃣ Asignación de agentes a campañas (BD, backend, frontend)

### Requisito:
3. Al **crear un agente**, se le debe asignar **a qué campaña(s) pertenece**.

### Lo que quiero que hagas:
- Revisar y, si hace falta, diseñar la estructura:
  - Tabla `agentes`
  - Relación `agente_campaign` (muchos a muchos si un agente puede estar en varias campañas).
- Validar:
  - BD: relaciones, claves foráneas, índices.
  - Backend: endpoints de creación/edición de agente con asignación de campañas.
  - Frontend: formularios donde el admin/supervisor selecciona campañas por agente.
- Asegúrate de que en todos los flujos:
  - La asignación de chats siempre respete las campañas asignadas a cada agente.

---

## 4️⃣ Validación de envío de mensajes

### Requisito:
4. Validar que los **mensajes realmente se estén enviando** de manera correcta.

### Lo que quiero que hagas:
- Revisar:
  - Lógica de envío de mensajes (integración Twilio → WhatsApp/SMS).
  - Manejo de errores/respuestas de Twilio.
  - Logs de envío y recepción.
- Proponer y/o implementar:
  - Registros de auditoría de mensajes (estado: enviado, entregado, error).
  - Mecanismo para que el sistema pueda detectar si algo falla en el envío.

---

## 5️⃣ Detección de riesgo de bloqueo / spam en Twilio

### Requisito:
5. El sistema debe detectar **riesgo de bloqueo o spam** por parte de Twilio, ya que **100% de la operación será por Twilio**.

### Lo que quiero que hagas:
- Analizar:
  - Frecuencia de mensajes por número.
  - Cantidad de mensajes a un mismo cliente.
  - Tasa de respuestas vs. envíos.
- Proponer e implementar:
  - Alertas internas cuando se supere un umbral de envío masivo que pueda parecer spam.
  - Señales para monitorear posibles códigos de error de Twilio relacionados con bloqueo/abuso.
  - Recomendaciones de rate limiting y mejores prácticas para no generar spam.

---

## 6️⃣ Estrategia de número(s) de Twilio por campaña

### Requisito:
6. Necesito que me indiques, con argumentos técnicos y operativos:
   - Si es mejor usar **un número por campaña**, o
   - Si con **un solo número** podemos soportar todas las campañas.

### Lo que quiero que hagas:
- Analizar:
  - Volumen esperado de chats por campaña.
  - Carga concurrente.
  - Riesgo de bloqueo.
  - Orden y claridad en la operación del call center.
- Emitir una recomendación clara:
  - ✅ Opción 1: un número por campaña (con pros y contras).
  - ✅ Opción 2: un solo número (con pros y contras).
- Proponer cómo implementarlo según la recomendación:
  - Cómo se configuraría Twilio.
  - Cómo se mapearían campañas ↔ números en la BD.
  - Cómo impacta en el enrutamiento y en el bot.

---

## 7️⃣ Revisión exhaustiva del sistema

### Requisito:
7. Revisar de forma **exhaustiva** que todo funcione.

### Lo que quiero que hagas:
- Revisar:
  - Todos los módulos del CRM.
  - Todos los endpoints del backend.
  - Todas las vistas críticas del frontend.
- Proponer y/o crear:
  - Checklist de pruebas.
  - Casos de prueba funcionales por módulo.
- Señalar puntos rotos, incoherentes o riesgosos.

---

## 8️⃣ Alertas de chats no respondidos (30 minutos) y chats activos (24 horas)

### Requisito:
8. Debe existir una **alerta** para chats que no han sido respondidos por los agentes en **máximo 30 minutos**, pero:
   - El chat **NO se cierra** por falta de respuesta del cliente,
   - Solo se cerrará cuando se cumplan las **24 horas** de actividad según reglas planteadas.

### Lo que quiero que hagas:
- Implementar y/o revisar:
  - Timestamps de último mensaje de cliente y de agente.
  - Job/cron que revise cada X minutos dónde:
    - `tiempo_desde_ultimo_mensaje_cliente` o `tiempo_desde_ultimo_mensaje_agente`.
  - Lógica:
    - A los 30 min sin respuesta del agente → alerta interna (a agente y/o supervisor).
    - A las 24 horas → cierre automático del chat + PDF de cierre + mensaje al cliente.
- Garantizar:
  - Que NO se cierre el chat solo porque el cliente no responde, **antes de las 24 horas**.

---

## 9️⃣ Lista de chats recientes – solo “pendientes por asignación”

### Requisito:
9. En la vista de **chats recientes**, solo deben aparecer los **chats pendientes por asignación**.

### Lo que quiero que hagas:
- Revisar en frontend:
  - Filtros aplicados a la lista de “chats recientes”.
- Ajustar en backend:
  - Endpoint para que devuelva solo chats con estado:
    - `status = "waiting_queue"` o similar.
- Evitar que aparezcan:
  - Chats ya asignados.
  - Chats cerrados.
  - Chats en historial.

---

## 🔟 Asignación automática de chats (ya no por supervisor)

### Requisito:
10. La asignación de chats **ya no debe hacerla el supervisor**:
   - El **sistema debe asignar automáticamente** al asesor disponible.
   - Los agentes deben manejar una **cantidad proporcional de chats por campaña**.

### Lo que quiero que hagas:
- Diseñar/ajustar la lógica de auto-asignación:
  - Filtro por campaña.
  - Agentes disponibles.
  - Distribución proporcional (round robin, carga mínima, etc.).
- Implementar:
  - Algoritmo que balancee los chats.
  - Registros de quién recibió qué chat y por qué.
- Asegurarte de:
  - Que el supervisor solo pueda reasignar, no asignar manual desde cero (salvo casos excepcionales si lo definimos).

---

## 1️⃣1️⃣ Pruebas de flujos de bots + instrucciones

### Requisito:
11. Se deben **probar los flujos de los bots** y dejar **instrucciones claras** de cómo crear flujos nuevos.

### Lo que quiero que hagas:
- Validar:
  - Que los flujos actuales del bot funcionan de inicio a fin.
  - Que transiciones bot → agente → cierre → bot de nuevo se comportan correctamente.
- Documentar:
  - Cómo se crea un flujo de bot desde cero.
  - Cómo se definen estados, preguntas, opciones, condiciones.
  - Buenas prácticas para futuros flujos.

---

## 1️⃣2️⃣ Registro de sesiones de asesores y métricas de actividad

### Requisito:
12. Se deben guardar las **sesiones de los asesores**:
   - Hora de entrada y salida al sistema.
   - Cuántos chats atendieron.
   - Cuántos mensajes enviaron.
   - Para uso administrativo y control de asistencia.

### Lo que quiero que hagas:
- Diseñar/ajustar:
  - Tablas de `session_logs`, `agent_activity`, etc.
- Implementar:
  - Registro al iniciar sesión.
  - Registro al cerrar sesión o expirar sesión.
  - Métricas:
    - número de chats gestionados por sesión,
    - número de mensajes enviados,
    - tiempo conectado.
- Preparar:
  - Endpoints y consultas para generar reportes.

---

## 1️⃣4️⃣ Confirmación de cierre + PDF obligatorio

### Requisito:
14. Siempre que se cierre un chat:
   - Se debe enviar **sí o sí** una **confirmación de cierre** al cliente.
   - Se debe generar el **PDF de cierre**.

### Lo que quiero que hagas:
- Revisar:
  - Lógica de cierre manual y automático de chats.
- Asegurar:
  - Mensaje obligatorio de cierre para el cliente.
  - Generación del PDF en todos los casos.
  - Guardar referencia del PDF ligada al chat.

---

## 1️⃣5️⃣ Datos reales de la gestión de los agentes

### Requisito:
15. Se deben mostrar los **datos reales de la gestión de los agentes**, sin inconsistencias.

### Lo que quiero que hagas:
- Revisar:
  - Cómo se calculan actualmente estadísticas por agente.
- Corregir o mejorar:
  - Cómputo de:
    - cantidad de chats por agente,
    - cantidad de mensajes,
    - tiempos de respuesta,
    - cierres realizados,
    - resultados de gestión.
- Proponer un panel / dashboard claro para:
  - supervisores,
  - admins.

---

## 1️⃣6️⃣ Métricas adicionales (ingeniería de datos)

### Requisito:
16. Quiero que pienses como **ingeniero de datos** y propongas **métricas adicionales** para que el CRM sea profesional.

### Lo que quiero que hagas:
Proponer e implementar (al menos a nivel de diseño):

- Métricas de agente:
  - TMO (Tiempo Medio de Operación por chat).
  - FRT (First Response Time).
  - Número de chats simultáneos.
  - Ratio de cierre efectivo (si aplica).

- Métricas de campaña:
  - Chats totales.
  - Chats atendidos vs no atendidos.
  - Tiempo promedio de espera en cola.
  - Distribución de carga entre agentes.

- Métricas de bot:
  - Porcentaje de casos resueltos solo por el bot.
  - Porcentaje de transferencias a agentes.
  - Drop rate (clientes que abandonan en el flujo del bot).

Indicar:
- Cómo almacenarlas.
- Cómo consultarlas.
- Propuesta de dashboards.

---

## 1️⃣7️⃣ Verificación de endpoints y cumplimiento de cronograma

### Requisito:
17. Que se verifique **cada uno de los endpoints**, y que, según el **cronograma de desarrollo** (el cual ya está retrasado), se compruebe:
   - Qué se implementó.
   - Qué está funcional.
   - Qué falta por completar.

### Lo que quiero que hagas:
- Listar:
  - Endpoints esperados según las funcionalidades descritas.
- Marcar:
  - Estado: implementado / no implementado / implementado con errores.
- Comparar:
  - Lo planificado vs. lo entregado.
- Entregar:
  - Informe/resumen con:
    - puntos listos,
    - puntos incompletos,
    - prioridades de corrección.

---

## 🎯 Estilo de respuesta que espero

- Responde de forma **estructurada, técnica y clara**.
- Usa secciones, listas y tablas.
- Siempre que propongas cambios, incluye:
  - Explicación conceptual.
  - Pseudocódigo o ejemplo de implementación.
  - Recomendaciones de buenas prácticas.
- Si ves riesgos críticos, márcalos como **BLOQUEANTES** para producción.

