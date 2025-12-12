-- Ver TODOS los workdays del agente hoy
SELECT id, "agentId", "workDate", "clockInTime", "currentStatus", "clockOutTime"
FROM agent_workdays
WHERE "agentId" = 'ef9e9222-ceeb-4b43-a52d-041264ff961c' 
  AND "workDate" = CURRENT_DATE
ORDER BY "clockInTime" DESC;

-- Ver TODAS las pausas (activas e inactivas) de hoy
SELECT p.id, p."workdayId", p."pauseType", p."startTime", p."endTime",
       w."clockInTime" as workday_start
FROM agent_pauses p
JOIN agent_workdays w ON w.id = p."workdayId"
WHERE w."agentId" = 'ef9e9222-ceeb-4b43-a52d-041264ff961c'
  AND w."workDate" = CURRENT_DATE
ORDER BY p."startTime" DESC;
