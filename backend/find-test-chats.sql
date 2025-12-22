-- Buscar chats de prueba de Alejandro y Andrea
SELECT id, "contactName", "contactPhone", status, "createdAt" 
FROM chats 
WHERE LOWER("contactName") LIKE '%alejandro%' 
   OR LOWER("contactName") LIKE '%andrea%' 
   OR "contactPhone" LIKE '%alejandro%' 
   OR "contactPhone" LIKE '%andrea%'
ORDER BY "createdAt" DESC;
