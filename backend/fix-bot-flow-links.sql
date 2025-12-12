-- Corregir los nextNodeId del flujo del bot
-- El problema: el nodo de saludo apunta a un nodo inexistente

-- Nodo 1: Saludo y Tratamiento de Datos -> debe ir a Validar Aceptación
UPDATE bot_nodes 
SET "nextNodeId" = '4ed221a1-7f42-4e9b-8f90-ad13ae3ead43'  -- Validar Aceptación
WHERE id = '3055cb03-8b70-480a-b944-1a3f21093657';  -- Saludo y Tratamiento de Datos

-- Verificar los nodos después de la corrección
SELECT 
    id, 
    name, 
    type, 
    "nextNodeId"
FROM bot_nodes 
WHERE "flowId" = 'ab8937f9-cc0c-4d5a-98c7-689600fbd54f' 
ORDER BY "createdAt";
