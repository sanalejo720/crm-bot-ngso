-- Ver cartera priorizada
SELECT 
    "fullName" as cliente,
    phone,
    "debtAmount" as deuda,
    "daysOverdue" as dias_mora,
    "collectionStatus" as estado,
    CASE 
        WHEN "daysOverdue" > 90 THEN 'URGENTE'
        WHEN "daysOverdue" > 30 THEN 'ALTA'
        WHEN "daysOverdue" > 15 THEN 'MEDIA'
        ELSE 'BAJA'
    END as prioridad
FROM clients
WHERE "debtAmount" > 0
ORDER BY "daysOverdue" DESC;
