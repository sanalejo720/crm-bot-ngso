-- Agregar columna debtorId a la tabla chats
ALTER TABLE chats ADD COLUMN IF NOT EXISTS "debtorId" UUID NULL;

-- Crear índice para mejorar performance
CREATE INDEX IF NOT EXISTS "IDX_chats_debtorId" ON chats("debtorId");

-- Agregar foreign key constraint (opcional, ya que no hay relación formal en TypeORM)
-- ALTER TABLE chats ADD CONSTRAINT "FK_chats_debtorId" FOREIGN KEY ("debtorId") REFERENCES debtors(id) ON DELETE SET NULL;

SELECT 'Columna debtorId agregada exitosamente a chats' as resultado;
