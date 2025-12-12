-- Buscar permiso evidences:read
SELECT * FROM permissions WHERE module = 'evidences' AND action = 'read';

-- Ver TODOS los permisos del módulo evidences
SELECT * FROM permissions WHERE module = 'evidences' ORDER BY action;
