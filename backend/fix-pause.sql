-- Eliminar trigger problemático
DROP TRIGGER IF EXISTS update_workday_updated_at ON agent_pauses;

-- Terminar pausa activa
UPDATE agent_pauses 
SET "endTime" = NOW() 
WHERE "workdayId" = '66c0a58b-f34b-4303-8ae6-936c05acf3d3' 
  AND "endTime" IS NULL;

-- Mostrar resultado
SELECT COUNT(*) as pausas_cerradas 
FROM agent_pauses 
WHERE "workdayId" = '66c0a58b-f34b-4303-8ae6-936c05acf3d3' 
  AND "endTime" IS NOT NULL;
