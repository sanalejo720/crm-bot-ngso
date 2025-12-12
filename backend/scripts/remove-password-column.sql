-- Eliminar columna encryptedPassword de evidences
-- Ya no se necesita contraseña, ahora usamos QR code

ALTER TABLE evidences DROP COLUMN IF EXISTS "encryptedPassword";

-- Verificar cambios
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'evidences'
ORDER BY ordinal_position;
