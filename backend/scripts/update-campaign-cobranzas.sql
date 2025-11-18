-- Actualizar configuración de campaña para cobranzas con auto-asignación
UPDATE campaigns 
SET settings = jsonb_set(
    COALESCE(settings, '{}'::jsonb),
    '{autoAssignment}',
    'true'::jsonb
)
WHERE name = 'Campaña Demo 2025';

UPDATE campaigns 
SET settings = jsonb_set(
    COALESCE(settings, '{}'::jsonb),
    '{assignmentStrategy}',
    '"least-busy"'::jsonb
)
WHERE name = 'Campaña Demo 2025';

-- Renombrar a campaña de cobranzas
UPDATE campaigns 
SET name = 'Cobranzas 2025',
    description = 'Campaña de gestión de cobranzas y recuperación de cartera'
WHERE name = 'Campaña Demo 2025';

-- Verificar
SELECT id, name, description, status, settings 
FROM campaigns 
WHERE name = 'Cobranzas 2025';
