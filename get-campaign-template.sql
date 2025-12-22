-- Ver el template de la campaña
SELECT 
  c.id,
  c.name,
  c.template_content,
  c.status,
  c.sent_count,
  c.created_at
FROM campaigns c
ORDER BY c.created_at DESC
LIMIT 5;
