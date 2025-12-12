-- Agregar permiso chats:assign a los agentes
-- Este permiso permite a los agentes transferir chats al bot

-- Primero, verificar si el permiso existe
INSERT INTO permissions (module, action, description)
VALUES ('chats', 'assign', 'Asignar o desasignar chats (incluyendo transferir al bot)')
ON CONFLICT (module, action) DO NOTHING;

-- Obtener el ID del permiso
DO $$
DECLARE
  permission_id UUID;
  agent_role_id UUID;
BEGIN
  -- Obtener el ID del permiso chats:assign
  SELECT id INTO permission_id 
  FROM permissions 
  WHERE module = 'chats' AND action = 'assign';
  
  -- Obtener el ID del rol Agente
  SELECT id INTO agent_role_id 
  FROM roles 
  WHERE name = 'Agente';
  
  -- Asignar el permiso al rol Agente si no existe
  IF permission_id IS NOT NULL AND agent_role_id IS NOT NULL THEN
    INSERT INTO role_permissions ("roleId", "permissionId")
    VALUES (agent_role_id, permission_id)
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE 'Permiso chats:assign agregado al rol Agente';
  ELSE
    RAISE NOTICE 'No se encontró el permiso o el rol';
  END IF;
END $$;

-- Verificar permisos del rol Agente
SELECT 
  r.name as rol,
  p.module,
  p.action,
  p.description
FROM roles r
JOIN role_permissions rp ON r.id = rp."roleId"
JOIN permissions p ON p.id = rp."permissionId"
WHERE r.name = 'Agente'
ORDER BY p.module, p.action;
