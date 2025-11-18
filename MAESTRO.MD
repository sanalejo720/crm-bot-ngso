Quiero que actúes como arquitecto de software senior y desarrollador full-stack experto en CRMs para call centers, con experiencia comprobada en:

- Integraciones con WhatsApp Business API (Meta Cloud API).
- Integraciones con WPPConnect (Node.js).
- Diseño de CRM omnicanal, enrutamiento de chats y dashboards de supervisión.
- Arquitecturas escalables para 18–30 agentes concurrentes y múltiples números de WhatsApp.

🎯 OBJETIVO GENERAL
Necesito que diseñes y me ayudes a construir paso a paso un **CRM para call center enfocado en WhatsApp Bot**, donde se puedan usar:
- De **1 a 10 números de WhatsApp** (cada número puede ser de Meta o WPPConnect).
- Entre **18 y 30 agentes humanos** conectados simultáneamente.
- Roles: **Super Administrador, Supervisor, Agente, Calidad, Auditoría**.

El CRM debe permitir:
- Atención por bot (WhatsApp) + transferencia a agente humano.
- Enrutamiento de chats por colas / campañas / habilidades.
- Gestión completa de clientes, chats, tickets, tareas y seguimiento.
- Módulo de estadísticas y reportes para gestión tipo call center.
- Copias de seguridad, auditorías y trazabilidad de la gestión.

📌 STACK TECNOLÓGICO
1. Primero, **pregúntame** con qué stack quiero trabajar (ejemplos):
   - Opción A: Backend en **Node.js + TypeScript** (Express o NestJS) + Base de datos relacional (PostgreSQL o MySQL) + Frontend en **React**.
   - Opción B: Backend en **Laravel (PHP)** + Base de datos MySQL/PostgreSQL + Panel admin (por ejemplo, Filament / Laravel Nova / Inertia + Vue/React).
   - Opción C: Otra combinación que tú recomiendes para alta concurrencia y facilidad de mantenimiento.

2. Una vez definido el stack, quiero que:
   - Propongas una **arquitectura por módulos** (auth, usuarios, roles, campañas, bots, chats, etc.).
   - Diseñes el **modelo de datos** completo (tablas/colecciones y relaciones).
   - Plantees una estructura de carpetas limpia y escalable.

👥 ROLES Y PERMISOS
Definir claramente los roles y sus capacidades:

1. **Super Administrador**
   - Gestionar toda la plataforma.
   - Crear/editar/eliminar empresas (si planteas multiempresa), campañas, colas, agentes, supervisores.
   - Configurar integraciones con Meta API y WPPConnect (tokens, webhooks, instancias).
   - Ver TODAS las estadísticas globales.
   - Configurar copias de seguridad (backups) manuales y programadas.

2. **Supervisor**
   - Ver y gestionar los chats de su campaña/equipo.
   - Asignar, transferir o reasignar chats entre agentes.
   - Monitoreo en tiempo real: chats activos, agentes conectados, estado de cada agente.
   - Ver métricas por campaña/equipo/agente (SPH, cantidad de chats, TMO, etc.).
   - Cerrar chats o intervenir cuando sea necesario (modo “tomar control”).

3. **Agente**
   - Recibir chats asignados automáticamente o manualmente.
   - Responder mensajes vía interfaz web de CRM.
   - Usar respuestas rápidas / plantillas / snippets.
   - Ver el historial del cliente, tags, notas internas.
   - Cambiar su estado: disponible, en pausa, en llamada, desconectado.

4. **Calidad**
   - Acceso a grabaciones de conversaciones (solo texto de los chats).
   - Marcar interacciones con calificación de calidad.
   - Dejar observaciones y tags de calidad por chat (ej: “mala actitud”, “no siguió script”).
   - Descargar reportes de calidad por agente / campaña / rango de fechas.

5. **Auditoría**
   - Acceso de solo lectura a logs de sistema y registros de cambios.
   - Ver quién asignó qué chat, cuándo se trasladó, quién cerró el caso, etc.
   - Generar reportes de auditoría con filtros avanzados.

📲 NÚMEROS DE WHATSAPP (1 a 10)
Diseñar un módulo para:

- Registrar y gestionar **múltiples números de WhatsApp**:
  - Tipo de integración: Meta Cloud API / WPPConnect.
  - Token / credenciales / URL de webhook / instancia.
  - Estado del número: activo, pausado, en error.
- Asociar números a:
  - Campañas específicas.
  - Colas de atención.
  - Horarios de funcionamiento.
- Reglas de enrutamiento:
  - Por número de origen (ej. número 1 = Campaña A, número 2 = Campaña B).
  - Por palabra clave detectada en el bot.
  - Por carga de agentes (balanceo básico).

🤖 BOT DE WHATSAPP + AGENTE HUMANO
Quiero que el sistema tenga dos capas:

1. **Capa Bot**
   - Flujos conversacionales definidos en base de datos (árboles de decisión).
   - Soportar:
     - Menús tipo texto / botones (según API).
     - Variables (ej.: nombre, documento, email).
     - Enlaces a landing pages o formularios externos si es necesario.
   - Capacidad para:
     - Registrar leads/contactos.
     - Validar datos básicos.
     - Encolar al cliente para agente humano.

2. **Transferencia a Agente Humano**
   - El bot entrega la conversación con:
     - Contexto del chat.
     - Datos capturados (nombre, teléfono, campaña, tags).
   - El CRM asigna automáticamente al mejor agente disponible según:
     - Cola/campaña.
     - Skill (etiquetas de agente).
     - Reglas de distribución (round robin, carga, prioridad).
   - Posibilidad de que el agente devuelva la conversación a la cola o la transfiera a otro agente/supervisor.

📇 MÓDULO CRM / GESTIÓN DE CLIENTES
Definir y modelar:

- Entidad **Cliente/Contacto**:
  - Datos básicos: nombre, teléfono (clave principal lógica), email, ciudad, etc.
  - Tags: “cliente nuevo”, “recurrente”, “VIP”, “mora”, etc.
  - Estado del lead: nuevo, en gestión, cerrado ganado, cerrado perdido, seguimiento.
  - Historial de conversaciones por número y canal.

- Entidad **Chat / Conversación**:
  - Asociación a cliente, número de WhatsApp, campaña, agente.
  - Timestamps: primer contacto, primera respuesta, cierre.
  - Motivo de contacto, resultado, tags.
  - Notas internas y tareas asociadas.

- Entidad **Tareas / Recordatorios**:
  - Para hacer seguimiento a un chat o cliente en fecha/hora específica.
  - Notificaciones internas para el agente y, opcionalmente, el supervisor.

📊 ESTADÍSTICAS Y REPORTES
Diseñar un módulo de estadísticas tipo call center donde se pueda ver:

- Por rango de fechas, campaña, número de WhatsApp, agente:
  - Total de chats recibidos.
  - Chats atendidos.
  - Chats abandonados (sin respuesta).
  - Tiempo medio de respuesta (TMR / FRT).
  - Tiempo medio de atención (TMO).
  - Conversaciones cerradas y su resultado.
  - SPH / conversiones (si se usa metric de ventas).
- Tableros en tiempo real:
  - Agentes conectados y su estado.
  - Chats activos.
  - Cola de espera.
  - SLA de respuesta (porcentaje en X segundos/minutos).

💾 COPIAS DE SEGURIDAD Y AUDITORÍA
Incluir en el diseño:

- Mecanismo de **backup**:
  - Exportar base de datos o colecciones clave.
  - Programar backups automáticos (ej.: diario) y descarga manual.
- Módulo de **logs/auditoría**:
  - Registro de login/logout.
  - Cambios de configuración (integraciones, campañas, roles).
  - Asignaciones y transferencias de chats.

🔐 SEGURIDAD Y ACCESOS
Definir:

- Sistema de autenticación con JWT / sesiones seguras.
- Control de acceso basado en roles (RBAC).
- Opciones de 2FA (si lo recomiendas).
- Validaciones para evitar acceso a chats o datos fuera del ámbito del rol.

📦 ENTREGABLES QUE NECESITO DE TI (PASO A PASO)
Quiero que trabajes de forma **iterativa**, entregando en orden:

1. **Resumen de la arquitectura propuesta** (diagrama conceptual y explicación).
2. **Modelo de datos completo**, con todas las tablas/colecciones y relaciones.
3. **Diseño de endpoints / APIs** principales:
   - Autenticación y gestión de usuarios/roles.
   - Gestión de números de WhatsApp.
   - Recepción de webhooks de WhatsApp (Meta / WPPConnect).
   - Envío de mensajes.
   - Gestión de chats, asignaciones y transferencias.
   - Módulo de estadísticas y reportes.
4. **Estructura de carpetas del proyecto** siguiendo buenas prácticas del stack elegido.
5. **Ejemplos de código reales**, incluyendo:
   - Configuración de la integración con Meta WhatsApp Cloud API.
   - Configuración de la integración con WPPConnect.
   - Ejemplo de webhook de recepción de mensajes.
   - Ejemplo de asignación automática de chats a agentes.
6. **Diseño del frontend**:
   - Vistas para cada rol (Super Admin, Supervisor, Agente, Calidad, Auditoría).
   - Mockups con descripción funcional de cada pantalla.
7. **Guía de despliegue**:
   - Requerimientos de servidor.
   - Variables de entorno.
   - Comandos de build / migrations / seeds.
   - Recomendaciones para producción (escalabilidad, colas de trabajo, monitoreo).

🧠 ESTILO DE RESPUESTA QUE QUIERO
- Explica todo de forma **muy clara y estructurada**.
- Usa títulos, subtítulos, listas y ejemplos de código bien formateados.
- Siempre que propongas algo técnico (endpoint, tabla, flujo), explícalo con:
  - **El qué**, **el por qué** y **el cómo** implementarlo.
- Si ves mejoras o buenas prácticas adicionales (como colas de mensajes, rate limiting, workers, etc.), proponlas proactivamente.

Empecemos por el paso 1: proponme 2–3 arquitecturas posibles (con stack tecnológico concreto) y dime cuál recomiendas para este CRM de WhatsApp bot con 18–30 agentes y 1–10 números de WhatsApp, justificando tu recomendación.
