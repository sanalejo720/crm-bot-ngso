-- Ver todos los permisos del módulo backups
SELECT id, module, action, description 
FROM permissions 
WHERE module = 'backups' 
ORDER BY action;
