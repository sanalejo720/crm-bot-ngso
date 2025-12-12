-- Ver todas las pausas activas (sin endTime)
SELECT id, "workdayId", "pauseType", "startTime", "endTime"
FROM agent_pauses
WHERE "workdayId" = '66c0a58b-f34b-4303-8ae6-936c05acf3d3'
  AND "endTime" IS NULL;

-- Cerrar TODAS las pausas activas
UPDATE agent_pauses 
SET "endTime" = NOW() 
WHERE "workdayId" = '66c0a58b-f34b-4303-8ae6-936c05acf3d3' 
  AND "endTime" IS NULL;

-- Verificar que se cerraron
SELECT COUNT(*) as pausas_activas 
FROM agent_pauses 
WHERE "workdayId" = '66c0a58b-f34b-4303-8ae6-936c05acf3d3' 
  AND "endTime" IS NULL;
