UPDATE chats 
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'::jsonb), 
  '{hasClientResponse}', 
  'false'
) 
WHERE metadata->>'source' = 'mass_campaign' 
  AND metadata->>'hasClientResponse' IS NULL;
