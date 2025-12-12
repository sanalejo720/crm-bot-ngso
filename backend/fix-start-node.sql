-- Actualizar startNodeId del flujo con el primer nodo existente
UPDATE bot_flows 
SET "startNodeId" = '3055cb03-8b70-480a-b944-1a3f21093657'
WHERE id = 'ab8937f9-cc0c-4d5a-98c7-689600fbd54f';

-- Verificar
SELECT id, name, "startNodeId" FROM bot_flows WHERE id = 'ab8937f9-cc0c-4d5a-98c7-689600fbd54f';
SELECT 'Nodo inicial configurado: Saludo y Tratamiento de Datos';
