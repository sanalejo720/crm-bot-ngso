-- Agregar valor 'twilio' al enum existente
-- PostgreSQL no permite IF NOT EXISTS en ADD VALUE, así que verificamos primero

DO $$
BEGIN
    -- Intentar agregar 'twilio' al enum si no existe
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'twilio' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'whatsapp_numbers_provider_enum')
    ) THEN
        ALTER TYPE whatsapp_numbers_provider_enum ADD VALUE 'twilio';
        RAISE NOTICE 'Valor twilio agregado al enum';
    ELSE
        RAISE NOTICE 'Valor twilio ya existe en el enum';
    END IF;
END$$;

-- Verificar que se agregó correctamente
SELECT enumlabel 
FROM pg_enum 
JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
WHERE pg_type.typname = 'whatsapp_numbers_provider_enum'
ORDER BY enumsortorder;
