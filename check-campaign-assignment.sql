-- Buscar mensajes de campañas masivas enviados a este número
SELECT 
  pa.id,
  pa.phone,
  pa.campaign_name,
  pa.assigned,
  pa.created_at
FROM pending_agent_assignments pa
WHERE pa.phone = '573116860369'
ORDER BY pa.created_at DESC;
