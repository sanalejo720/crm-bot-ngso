-- Listar triggers
SELECT tgname FROM pg_trigger WHERE tgrelid = 'agent_pauses'::regclass;

-- Eliminar función problemática
DROP FUNCTION IF EXISTS update_workday_updated_at() CASCADE;

-- Intentar UPDATE nuevamente
UPDATE agent_pauses 
SET "endTime" = NOW() 
WHERE "workdayId" = '66c0a58b-f34b-4303-8ae6-936c05acf3d3' 
  AND "endTime" IS NULL;
