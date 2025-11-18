-- Asegurar que el rol de Agente tenga todos los permisos necesarios

-- Obtener el ID del rol Agente
DO $$
DECLARE
  agent_role_id UUID;
  perm_id UUID;
BEGIN
  -- Obtener el ID del rol Agente
  SELECT id INTO agent_role_id FROM roles WHERE name = 'Agente' LIMIT 1;
  
  IF agent_role_id IS NULL THEN
    RAISE NOTICE 'Rol Agente no encontrado';
    RETURN;
  END IF;

  RAISE NOTICE 'Rol Agente ID: %', agent_role_id;

  -- Permisos que necesita un agente
  -- Chats
  INSERT INTO role_permissions ("roleId", "permissionId")
  SELECT agent_role_id, id FROM permissions WHERE module = 'chats' AND action = 'read'
  ON CONFLICT DO NOTHING;
  
  INSERT INTO role_permissions ("roleId", "permissionId")
  SELECT agent_role_id, id FROM permissions WHERE module = 'chats' AND action = 'update'
  ON CONFLICT DO NOTHING;
  
  INSERT INTO role_permissions ("roleId", "permissionId")
  SELECT agent_role_id, id FROM permissions WHERE module = 'chats' AND action = 'assign'
  ON CONFLICT DO NOTHING;

  -- Messages
  INSERT INTO role_permissions ("roleId", "permissionId")
  SELECT agent_role_id, id FROM permissions WHERE module = 'messages' AND action = 'create'
  ON CONFLICT DO NOTHING;
  
  INSERT INTO role_permissions ("roleId", "permissionId")
  SELECT agent_role_id, id FROM permissions WHERE module = 'messages' AND action = 'read'
  ON CONFLICT DO NOTHING;

  -- Clients
  INSERT INTO role_permissions ("roleId", "permissionId")
  SELECT agent_role_id, id FROM permissions WHERE module = 'clients' AND action = 'read'
  ON CONFLICT DO NOTHING;
  
  INSERT INTO role_permissions ("roleId", "permissionId")
  SELECT agent_role_id, id FROM permissions WHERE module = 'clients' AND action = 'update'
  ON CONFLICT DO NOTHING;

  -- Tasks
  INSERT INTO role_permissions ("roleId", "permissionId")
  SELECT agent_role_id, id FROM permissions WHERE module = 'tasks' AND action = 'create'
  ON CONFLICT DO NOTHING;
  
  INSERT INTO role_permissions ("roleId", "permissionId")
  SELECT agent_role_id, id FROM permissions WHERE module = 'tasks' AND action = 'read'
  ON CONFLICT DO NOTHING;
  
  INSERT INTO role_permissions ("roleId", "permissionId")
  SELECT agent_role_id, id FROM permissions WHERE module = 'tasks' AND action = 'update'
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Permisos agregados correctamente';
END $$;

-- Verificar permisos del rol Agente
SELECT 
  r.name as rol,
  p.module || ':' || p.action as permiso,
  p.description
FROM roles r
JOIN role_permissions rp ON r.id = rp."roleId"
JOIN permissions p ON p.id = rp."permissionId"
WHERE r.name = 'Agente'
ORDER BY p.module, p.action;
