-- Actualizar mensajes con encoding correcto UTF-8

-- 1. Saludo y Autorización
UPDATE bot_nodes SET config = '{"message": "👋 Hola.\n\nEn NGSO Abogados S.A.S. protegemos tu información personal de acuerdo con la Ley 1581 de 2012, el Decreto 1377 de 2013 y demás normas sobre protección de datos personales vigentes en Colombia.\n\nAl continuar, autorizas de manera previa, expresa e informada el tratamiento de tus datos personales para fines de gestión de cobranza, contacto y seguimiento de tu caso, conforme a nuestra Política de Protección de Datos Personales, disponible en:\n👉 http://www.ngsoabogados.com/pol-tica-de-protecci-n-de-datos-personales.html\n\nPor favor indica una opción:", "useButtons": true, "buttonTitle": "Autorización de Datos", "buttons": [{"id": "acepto", "text": "✅ Acepto"}, {"id": "no_acepto", "text": "❌ No acepto"}]}'::jsonb
WHERE id = '10000000-0000-0000-0000-000000000001';

-- 3. Confirmación y Solicitar Documento  
UPDATE bot_nodes SET config = '{"message": "✅ Gracias.\n\nHemos registrado tu autorización para el tratamiento de datos personales.\nAhora continuaremos con la validación de tu información para poder ayudarte con tu caso.\n\nPara continuar, por favor indícanos tu número de documento de identidad (sin puntos ni comas).\n\n📝 Ejemplo: 123456789"}'::jsonb
WHERE id = '10000000-0000-0000-0000-000000000003';

-- 5. Buscar Deudor
UPDATE bot_nodes SET config = '{"message": "🔍 Buscando tu información en nuestro sistema... Un momento por favor."}'::jsonb
WHERE id = '10000000-0000-0000-0000-000000000005';

-- 7. Presentar Información Deuda
UPDATE bot_nodes SET config = '{"message": "✅ Hemos encontrado información asociada a tu documento:\n\n• Nombre: {{debtor_nombre}}\n• Compañía: {{debtor_compania}}\n• Campaña: {{debtor_campana}}\n• Valor de la deuda: {{debtor_valor_deuda}}\n• Correo: {{debtor_correo}}\n• Teléfono: {{debtor_telefono}}\n• Estado: {{debtor_estado}}\n\nA continuación, te comunicaremos con uno de nuestros asesores para revisar tu caso y ofrecerte alternativas de solución.", "useButtons": true, "buttonTitle": "¿Qué deseas hacer?", "buttons": [{"id": "hablar_asesor", "text": "💬 Hablar con asesor"}, {"id": "ver_metodos_pago", "text": "💳 Ver métodos de pago"}]}'::jsonb
WHERE id = '10000000-0000-0000-0000-000000000007';

-- 8. Deudor No Encontrado
UPDATE bot_nodes SET config = '{"message": "⚠️ No hemos encontrado ninguna cuenta asociada al número de documento {{debtorDocument}} en nuestra base de datos.\n\nTe vamos a trasladar con un asesor para que valide tu información y, si es necesario, registre tus datos correctamente en el sistema."}'::jsonb
WHERE id = '10000000-0000-0000-0000-000000000008';

-- 10. Transferir a Asesor
UPDATE bot_nodes SET config = '{"message": "🔄 En este momento estamos asignando tu caso a uno de nuestros asesores disponibles.\n\n⏳ Por favor espera un momento mientras conectamos tu chat.\n\nTe notificaremos en este mismo canal cuando el asesor haya sido asignado.", "skills": ["cobranza"], "priority": "normal"}'::jsonb
WHERE id = '10000000-0000-0000-0000-000000000010';

-- 11. Métodos de Pago
UPDATE bot_nodes SET config = '{"message": "💳 Métodos de pago disponibles:\n\n✅ Transferencia bancaria\n✅ PSE\n✅ Tarjeta de crédito/débito\n✅ Efectivo en puntos autorizados\n\n¿Deseas hablar con un asesor para más información?", "useButtons": true, "buttonTitle": "¿Hablar con asesor?", "buttons": [{"id": "si_asesor", "text": "✅ Sí, conectar"}, {"id": "no_gracias", "text": "❌ No, gracias"}]}'::jsonb
WHERE id = '10000000-0000-0000-0000-000000000011';

-- 13. Despedida
UPDATE bot_nodes SET config = '{"message": "Gracias por comunicarte con nosotros.\n\nSi en el futuro deseas retomar tu caso o conocer alternativas de pago, puedes contactarnos nuevamente por este canal.\n\n¡Que tengas un excelente día! 😊"}'::jsonb
WHERE id = '10000000-0000-0000-0000-000000000013';

-- 99. Rechazo Autorización
UPDATE bot_nodes SET config = '{"message": "❌ Entendemos tu decisión.\n\nSin embargo, te informamos que no podemos continuar con la gestión ni brindarte información sobre tu caso porque la autorización para el tratamiento de tus datos personales es obligatoria para prestar nuestros servicios, conforme a la normativa colombiana de protección de datos.\n\nSi en algún momento decides autorizar el tratamiento de tus datos, podrás volver a escribirnos y con gusto retomaremos la atención.\n\n¡Hasta pronto!"}'::jsonb
WHERE id = '10000000-0000-0000-0000-000000000099';
