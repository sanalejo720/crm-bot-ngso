-- Eliminar chats de prueba de Alejandro y Andrea
DELETE FROM chats 
WHERE id IN (
  '574f67eb-e05c-4082-bef6-d66a7af375f9',
  'bf841309-aad2-4438-97db-b9018f1f14fa',
  'e4d759a8-ba43-4f66-9cc6-28c153bc9cc1'
);
