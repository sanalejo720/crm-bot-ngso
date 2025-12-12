-- Ver todos los permisos del módulo payment_evidences
SELECT id, module, action, description 
FROM permissions 
WHERE module = 'payment_evidences' 
ORDER BY action;
