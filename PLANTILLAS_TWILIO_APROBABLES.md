# 📋 Plantillas WhatsApp para Twilio - NGS&O Abogados / El Libertador S.A.

## ⚠️ Importante: Políticas de Meta/WhatsApp

Meta rechaza plantillas que contengan:
- ❌ Lenguaje amenazante (mencionar demandas, procesos legales)
- ❌ Referencias a consecuencias negativas (reportes a centrales de riesgo)
- ❌ Mencionar leyes específicas (Ley 820, etc.)
- ❌ Tono de presión/urgencia excesiva

### Tabla de conversión de términos:

| ❌ Evitar | ✅ Usar |
|-----------|---------|
| "mora", "deuda" | "saldo pendiente", "valores pendientes" |
| "consecuencias legales" | "encontrar soluciones" |
| "reporte a centrales" | (no mencionar) |
| "proceso judicial" | (no mencionar) |
| "incumplimiento" | "pendiente" |
| Mencionar leyes | (no mencionar) |
| "urgente", "inmediato" | "te invitamos", "cuando puedas" |

---

# 📁 CATEGORÍA 1: DESISTIDOS

## 1️⃣ DESISTIDOS - PRIMER AVISO

**Configuración en Twilio:**
- **Name:** `desistido_aviso_1`
- **Category:** `UTILITY`
- **Language:** `Spanish (es)`

**Cuerpo del mensaje:**
```
Cordial saludo {{1}},

NGS&O Abogados, en representación de Investigaciones y Cobranzas El Libertador S.A., le informa que la inmobiliaria ha reportado un saldo pendiente en el pago del canon de arrendamiento correspondiente al periodo de {{2}}.

📋 Solicitud: {{3}}

Para regularizar su situación, le invitamos a realizar el pago directamente a la inmobiliaria y enviar el soporte por este medio.

Si ya realizó el pago, por favor haga caso omiso.

Atentamente,
{{4}}
NGS&O Abogados
```

**Variables:**
| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| {{1}} | Nombre del cliente | Juan Pérez |
| {{2}} | Periodo/meses pendientes | Noviembre y Diciembre 2025 |
| {{3}} | Número de solicitud | 10732468 |
| {{4}} | Nombre del asesor | María García |

---

## 2️⃣ DESISTIDOS - SEGUNDO AVISO

**Configuración en Twilio:**
- **Name:** `desistido_aviso_2`
- **Category:** `UTILITY`
- **Language:** `Spanish (es)`

**Cuerpo del mensaje:**
```
Cordial saludo {{1}},

NGS&O Abogados, en representación de Investigaciones y Cobranzas El Libertador S.A., le notifica que a la fecha no se ha registrado el pago de los cánones de arrendamiento correspondientes a {{2}}.

📋 Solicitud: {{3}}

Es importante que nos contacte antes del {{4}} para encontrar la mejor solución y evitar inconvenientes adicionales.

Para regularizar su situación, realice el pago directamente a la inmobiliaria y envíe el soporte por este medio.

Atentamente,
{{5}}
NGS&O Abogados
```

**Variables:**
| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| {{1}} | Nombre del cliente | Juan Pérez |
| {{2}} | Meses pendientes | Octubre y Noviembre 2025 |
| {{3}} | Número de solicitud | 10732468 |
| {{4}} | Fecha límite | 20/12/2025 |
| {{5}} | Nombre del asesor | María García |

---

## 3️⃣ DESISTIDOS - TERCER AVISO

**Configuración en Twilio:**
- **Name:** `desistido_aviso_3`
- **Category:** `UTILITY`
- **Language:** `Spanish (es)`

**Cuerpo del mensaje:**
```
Cordial saludo {{1}},

NGS&O Abogados, en representación de Investigaciones y Cobranzas El Libertador S.A., le notifica que los cánones de arrendamiento continúan pendientes.

📋 Solicitud: {{2}}

Le recordamos que tiene plazo hasta el {{3}} para regularizar su situación directamente con la inmobiliaria. Después de esta fecha, su caso pasará a otra instancia de gestión.

Por favor realice el pago y envíe el soporte por este medio o al correo ellibertador20@ngsoabogados.com

Atentamente,
{{4}}
NGS&O Abogados
```

**Variables:**
| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| {{1}} | Nombre(s) del deudor/codeudor | Juan Pérez, Carlos López |
| {{2}} | Número de solicitud | 10732468 |
| {{3}} | Fecha límite | 20/12/2025 |
| {{4}} | Nombre del asesor | María García |

---

# 📁 CATEGORÍA 2: VIGENTES

## 4️⃣ VIGENTES - PRIMER AVISO

**Configuración en Twilio:**
- **Name:** `vigente_aviso_1`
- **Category:** `UTILITY`
- **Language:** `Spanish (es)`

**Cuerpo del mensaje:**
```
Cordial saludo {{1}},

NGS&O Abogados, en representación de Investigaciones y Cobranzas El Libertador S.A., le informa que tiene valores pendientes en el pago de los cánones correspondientes a su contrato de arrendamiento.

📋 Solicitud: {{2}}

Le invitamos a regularizar su situación. Solicite su link de pago respondiendo a este mensaje y con gusto le asistimos.

Si tiene alguna dificultad, cuéntenos para buscar alternativas.

Atentamente,
{{3}}
NGS&O Abogados
```

**Variables:**
| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| {{1}} | Nombre del cliente | Juan Pérez |
| {{2}} | Número de solicitud | 10732468 |
| {{3}} | Nombre del asesor | María García |

---

## 5️⃣ VIGENTES - SEGUNDO AVISO

**Configuración en Twilio:**
- **Name:** `vigente_aviso_2`
- **Category:** `UTILITY`
- **Language:** `Spanish (es)`

**Cuerpo del mensaje:**
```
Cordial saludo {{1}},

NGS&O Abogados, en representación de Investigaciones y Cobranzas El Libertador S.A., le informa que presenta un saldo pendiente de más de {{2}} días en el pago de los cánones de su contrato de arrendamiento.

📋 Solicitud: {{3}}

Es importante regularizar su situación para evitar inconvenientes. Le invitamos a solicitar su link de pago en los próximos {{4}} días respondiendo a este mensaje.

Atentamente,
{{5}}
NGS&O Abogados
```

**Variables:**
| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| {{1}} | Nombre del cliente | Juan Pérez |
| {{2}} | Días transcurridos | 50 |
| {{3}} | Número de solicitud | 10732468 |
| {{4}} | Días de plazo | 2 |
| {{5}} | Nombre del asesor | María García |

---

## 6️⃣ VIGENTES - TERCER AVISO

**Configuración en Twilio:**
- **Name:** `vigente_aviso_3`
- **Category:** `UTILITY`
- **Language:** `Spanish (es)`

**Cuerpo del mensaje:**
```
Estimado(a) {{1}},

NGS&O Abogados, en representación de Investigaciones y Cobranzas El Libertador S.A., le contacta con información importante sobre su contrato de arrendamiento.

💰 Valor pendiente: {{2}}
🏠 Inmueble: {{3}}
🏢 Arrendador: {{4}}

Es necesario que nos contacte en los próximos días para revisar su situación y brindarle opciones de solución.

Estamos para ayudarle.

Atentamente,
NGS&O Abogados
```

**Variables:**
| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| {{1}} | Nombre(s) del deudor/codeudor | Juan Pérez, Carlos López |
| {{2}} | Valor pendiente | $7.923.200 |
| {{3}} | Dirección del inmueble | CR 89 80 52 BG |
| {{4}} | Nombre del arrendador | Grupo Inmobiliario Kapital SAS |

---

# 📁 CATEGORÍA 3: DESOCUPADOS Y CASTIGO

## 7️⃣ DESOCUPADOS/CASTIGO - PRIMER AVISO

**Configuración en Twilio:**
- **Name:** `desocupado_aviso_1`
- **Category:** `MARKETING`
- **Language:** `Spanish (es)`

**Cuerpo del mensaje:**
```
Señor(a) {{1}}

ASUNTO: ¡Oportunidad para regularizar su situación! - Solicitud: {{2}}

Cordial saludo.

NGS&O Abogados, en representación de Investigaciones y Cobranzas El Libertador S.A., le reitera la invitación al pago de la obligación pendiente por cánones del contrato de arrendamiento con {{3}}.

🎉 Lo invitamos a acogerse a nuestra campaña de descuentos vigente hasta el {{4}}.

Para conocer su beneficio y realizar el pago, comuníquese con {{5}}:
📞 (601) 4320170 – opción 4
📱 333 0334068 – opción 4

Si ya realizó el pago, haga caso omiso. ¡Gracias!
```

**Variables:**
| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| {{1}} | Nombre del cliente | Juan Pérez |
| {{2}} | Número de solicitud | 10732468 |
| {{3}} | Nombre de la inmobiliaria | Grupo Inmobiliario Kapital |
| {{4}} | Fecha límite campaña | 31/12/2025 |
| {{5}} | Nombre del gestor | María García |

---

## 8️⃣ DESOCUPADOS/CASTIGO - SEGUNDO AVISO

**Configuración en Twilio:**
- **Name:** `desocupado_aviso_2`
- **Category:** `UTILITY`
- **Language:** `Spanish (es)`

**Cuerpo del mensaje:**
```
Cordial saludo,

NGS&O Abogados, en representación de Investigaciones y Cobranzas El Libertador S.A., solicita la atención de {{1}} respecto a valores pendientes del contrato de arrendamiento con {{2}}.

🏠 Inmueble: {{3}}
📍 Ciudad: {{4}}

Queremos ayudarle a encontrar una solución. Si lo desea, podemos llamarle para explicarle las alternativas disponibles.

📞 (601) 4320170 – opción 4
📱 333 0334068 – opción 4

Responda a este mensaje si prefiere que le llamemos.

📋 Solicitud: {{5}}

Atentamente,
NGS&O Abogados
```

**Variables:**
| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| {{1}} | Nombre del cliente | Juan Pérez |
| {{2}} | Nombre de la inmobiliaria | Grupo Inmobiliario Kapital |
| {{3}} | Dirección del inmueble | CR 89 80 52 BG |
| {{4}} | Ciudad | Bogotá |
| {{5}} | Número de solicitud | 10732468 |

---

# 📁 PLANTILLAS ADICIONALES

## 9️⃣ MENSAJE DE BIENVENIDA/CONTACTO INICIAL

**Configuración en Twilio:**
- **Name:** `contacto_inicial`
- **Category:** `UTILITY`
- **Language:** `Spanish (es)`

**Cuerpo del mensaje:**
```
Cordial saludo {{1}},

NGS&O Abogados, en representación de Investigaciones y Cobranzas El Libertador S.A., se comunica con usted respecto a su contrato de arrendamiento.

📋 Solicitud: {{2}}

Queremos brindarle información importante. Por favor responda a este mensaje para continuar la conversación.

Atentamente,
{{3}}
NGS&O Abogados
```

**Variables:**
| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| {{1}} | Nombre del cliente | Juan Pérez |
| {{2}} | Número de solicitud | 10732468 |
| {{3}} | Nombre del asesor | María García |

---

## 🔟 CONFIRMACIÓN DE PAGO

**Configuración en Twilio:**
- **Name:** `confirmacion_pago`
- **Category:** `UTILITY`
- **Language:** `Spanish (es)`

**Cuerpo del mensaje:**
```
Cordial saludo {{1}},

NGS&O Abogados, en representación de Investigaciones y Cobranzas El Libertador S.A., confirma la recepción de su pago.

📋 Solicitud: {{2}}
💰 Valor recibido: {{3}}
📅 Fecha: {{4}}

Gracias por regularizar su situación. Si tiene alguna consulta adicional, estamos para servirle.

Atentamente,
{{5}}
NGS&O Abogados
```

**Variables:**
| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| {{1}} | Nombre del cliente | Juan Pérez |
| {{2}} | Número de solicitud | 10732468 |
| {{3}} | Valor del pago | $1.500.000 |
| {{4}} | Fecha del pago | 17/12/2025 |
| {{5}} | Nombre del asesor | María García |

---

# 🚀 Pasos para crear en Twilio

1. **Ir a Content Template Builder:** 
   https://console.twilio.com/us1/develop/sms/content-template-builder

2. **Click en "Create new template"**

3. **Completar los campos:**
   - Name: (copiar de arriba)
   - Language: Spanish
   - Category: UTILITY o MARKETING según corresponda
   - Body: (copiar el cuerpo del mensaje)

4. **Agregar Sample Values** para cada variable

5. **Click en "Submit for approval"**

6. **Esperar 24-72 horas** para la aprobación de Meta

---

# 📊 Resumen de Plantillas

| # | Nombre | Categoría | Tipo |
|---|--------|-----------|------|
| 1 | desistido_aviso_1 | UTILITY | Desistidos - 1er aviso |
| 2 | desistido_aviso_2 | UTILITY | Desistidos - 2do aviso |
| 3 | desistido_aviso_3 | UTILITY | Desistidos - 3er aviso |
| 4 | vigente_aviso_1 | UTILITY | Vigentes - 1er aviso |
| 5 | vigente_aviso_2 | UTILITY | Vigentes - 2do aviso |
| 6 | vigente_aviso_3 | UTILITY | Vigentes - 3er aviso |
| 7 | desocupado_aviso_1 | MARKETING | Desocupados - 1er aviso |
| 8 | desocupado_aviso_2 | UTILITY | Desocupados - 2do aviso |
| 9 | contacto_inicial | UTILITY | Mensaje inicial |
| 10 | confirmacion_pago | UTILITY | Confirmación |

---

## 📌 Notas adicionales

- Las plantillas de categoría **UTILITY** tienen mayor tasa de aprobación
- Las plantillas **MARKETING** requieren que el usuario haya dado consentimiento previo
- Una vez aprobadas, obtendrás un **Content SID** (ej: `HXxxxxxxxxx`) para usar en el código
- Si una plantilla es rechazada, puedes editar y volver a enviar
- Todas las plantillas incluyen la mención a **Investigaciones y Cobranzas El Libertador S.A.**
