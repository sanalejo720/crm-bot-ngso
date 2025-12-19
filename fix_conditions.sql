-- Actualizar condiciones del nodo Validar Autorización para que coincidan con los botones de Twilio
UPDATE bot_nodes 
SET config = '{
  "conditions": [
    {
      "id": "acepta-boton-si",
      "value": "autorizo_si",
      "operator": "equals",
      "variable": "selected_button",
      "targetNodeId": "10000000-0000-0000-0000-000000000003"
    },
    {
      "id": "acepta-texto-boton",
      "value": "sí, autorizo",
      "operator": "contains_ignore_case",
      "variable": "user_response",
      "targetNodeId": "10000000-0000-0000-0000-000000000003"
    },
    {
      "id": "acepta-1",
      "value": "1",
      "operator": "equals",
      "variable": "user_response",
      "targetNodeId": "10000000-0000-0000-0000-000000000003"
    },
    {
      "id": "acepta-si",
      "value": "si",
      "operator": "contains_ignore_case",
      "variable": "user_response",
      "targetNodeId": "10000000-0000-0000-0000-000000000003"
    },
    {
      "id": "acepta-acepto",
      "value": "acepto",
      "operator": "contains_ignore_case",
      "variable": "user_response",
      "targetNodeId": "10000000-0000-0000-0000-000000000003"
    },
    {
      "id": "acepta-autorizo",
      "value": "autorizo",
      "operator": "contains_ignore_case",
      "variable": "user_response",
      "targetNodeId": "10000000-0000-0000-0000-000000000003"
    }
  ],
  "defaultNodeId": "10000000-0000-0000-0000-000000000099"
}'::jsonb
WHERE id = '10000000-0000-0000-0000-000000000002';

-- Verificar
SELECT name, config FROM bot_nodes WHERE id = '10000000-0000-0000-0000-000000000002';
