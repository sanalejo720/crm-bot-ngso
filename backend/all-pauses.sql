-- Ver TODAS las pausas incluyendo las más recientes
SELECT id, "pauseType", "startTime", "endTime",
       CASE WHEN "endTime" IS NULL THEN 'ACTIVA' ELSE 'CERRADA' END as estado
FROM agent_pauses 
WHERE "workdayId" = '66c0a58b-f34b-4303-8ae6-936c05acf3d3' 
ORDER BY "startTime" DESC;
