-- Verificar valores actuales del enum
SELECT enumlabel 
FROM pg_enum 
JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
WHERE pg_type.typname = 'whatsapp_numbers_provider_enum'
ORDER BY enumsortorder;
