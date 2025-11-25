📘 CRM WhatsApp Bot – Especificación de Mejoras
Documento Técnico en Markdown
🧩 1. Carga de Base de Datos por el Administrador

El administrador debe poder cargar un archivo Excel o CSV con la información de cartera.
La estructura obligatoria del archivo es:

| tipo_doc | documento | nombre | compania | deuda | mora_dias | campaign_id |

El sistema debe:

Validar formato, columnas y duplicados.

Crear/actualizar registros en cartera_clientes.

Asociar cada cliente a una campaña según campaign_id.

Indexar por documento + campaña para búsqueda rápida.

Generar reporte de carga: registros válidos, fallidos y duplicados.

🤖 2. Flujo Automático del Bot al Ingresar por WhatsApp

El cliente recibe un SMS con un link, abre WhatsApp y el bot inicia automáticamente.

2.1 Mensaje de bienvenida + aceptación de datos

El bot debe enviar:

👋 ¡Hola! Bienvenido(a) al sistema de gestión de cartera.
Antes de continuar, necesitamos tu autorización para el tratamiento de datos personales.


Botones obligatorios:

ACEPTO

NO ACEPTO

No se permiten respuestas por texto en esta etapa.

2.2 Validación del documento

Si el cliente acepta:

El bot solicita tipo y número de documento.

El cliente responde (puede ser texto o botones).

El bot consulta en la tabla cartera_clientes.

Si encuentra coincidencia:

Envía los datos:

📄 Cliente: {{nombre}}
🏢 Compañía: {{compania}}
💰 Valor adeudado: ${{deuda}}
⏳ Días en mora: {{mora_dias}}


Genera un chat/ticket.

Transfiere al agente asignado según campaña.

Si NO se encuentra:

❌ No encontramos información asociada al documento ingresado.
Por favor verifica e intenta nuevamente.

👨‍💼 3. Transferencia al Agente

Cuando se identifica al cliente:

Se corta totalmente el flujo del bot.

Se asigna el chat según:

campaña,

skill del agente,

carga de trabajo,

disponibilidad.

Información que debe recibir el agente:
📌 NUEVO CLIENTE EN GESTIÓN DE CARTERA

Cliente: {{nombre}}
Documento: {{tipo_doc}} {{documento}}
Compañía: {{compania}}
Valor de la deuda: ${{deuda}}
Días en mora: {{mora_dias}}
Campaña: {{campaign_id}}


El agente continúa manualmente.

🧾 4. Gestión de Plantillas (Templates)
Reglas:

Solo el administrador puede:

Crear plantillas

Editar plantillas

Eliminar plantillas

Activar/desactivar plantillas

Los asesores NO pueden:

Crear plantillas

Editar plantillas

Ver el módulo de administración

Los agentes solo pueden:

Ver lista de plantillas aprobadas.

Enviarlas con un solo clic.

Nunca deben ver código, variables o configuraciones internas.

🔄 5. Reactivación Automática del Bot

El bot sigue estas reglas:

5.1 Activación inicial

Cualquier texto activa el bot.

Se inicia el flujo de bienvenida + aceptación de datos.

5.2 Al transferirse al agente

El bot queda completamente inactivo.

El agente toma control.

5.3 Reactivación después de 24 horas

Si pasan 24 horas sin actividad, el sistema debe:

Cerrar el chat anterior (status: expired_bot_reset).

Iniciar automáticamente el flujo del bot:

Hola, ha pasado un tiempo desde tu último contacto.  
Para continuar, por favor selecciona una opción:


Botón:

ACEPTAR TRATAMIENTO DE DATOS

5.4 Si el cliente escribe después de 24 horas

El flujo del bot siempre debe reactivarse desde cero.

Volver a pedir aceptación.

🔄 6. Reglas de Enrutamiento a Agentes

El sistema debe asignar al agente:

Según campaña.

Según disponibilidad.

Según balanceo de carga dinámico.

El supervisor puede reasignar manualmente.

Estados del agente:

Disponible

Ocupado

Inactivo

En pausa

📂 7. Requerimientos de Auditoría y Logs

El sistema debe guardar:

Auditoría del bot

Mensaje de bienvenida enviado

Respuesta del cliente

Validación documento

Resultados de búsqueda

Transferencia

Auditoría del agente

Mensajes enviados

Notas internas

Plantillas utilizadas

Cierre del chat

Logs del sistema

Webhooks recibidos

Errores de integración

Tiempos y expiraciones

Eventos automáticos (24h)

📌 8. Instrucciones para el Modelo de IA

Con toda esta especificación, necesito que desarrolles:

A. Modelo de datos:

Tablas completas

Relaciones

Índices recomendados

Ejemplos de estructuras

B. Backend:

Endpoints necesarios

Validaciones

Controladores

Servicios

Lógica del bot

Lógica de reactivación a 24h

Lógica de asignación de agentes

Manejo de plantillas

Webhooks Meta/WPPConnect

C. Frontend:

Panel de Administrador

Panel de Supervisor

Panel de Agente

Módulo de plantillas

Módulo de carga de cartera

Diseño de UI/UX

D. Pseudocódigo:

Flujo del bot paso a paso

Flujo de transferencia

Reactivación a 24h

Verificación de documento

E. Botones Interactivos:

Ejemplos reales para Meta API

Códigos listos para pruebas

F. Diagramas:

Diagrama de flujo del bot

Diagrama de estado del chat

G. Seguridad:

Roles y permisos

Validación de datos

Trazabilidad