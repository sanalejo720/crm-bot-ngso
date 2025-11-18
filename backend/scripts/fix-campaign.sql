-- Actualizar campaña a cobranzas
UPDATE campaigns 
SET 
    name = 'Cobranzas 2025',
    description = 'Gestión de cobranzas y recuperación de cartera',
    settings = jsonb_build_object(
        'autoAssignment', true,
        'assignmentStrategy', 'least-busy',
        'maxConcurrentChats', 5
    )
WHERE id = '24292dd8-8f30-44b0-82a9-3ea7c17d39cd';

-- Verificar
SELECT name, description, settings 
FROM campaigns 
WHERE id = '24292dd8-8f30-44b0-82a9-3ea7c17d39cd';
