-- Resetear el botContext del chat activo para que vuelva a empezar

-- Ver el chat actual
SELECT 
    id,
    "contactPhone",
    is_bot_active,
    "botContext"
FROM chats
WHERE id = 'e731775e-f41d-46c3-b671-74987c4905c4';

-- Resetear el botContext para forzar reinicio del bot
UPDATE chats
SET "botContext" = NULL,
    is_bot_active = false
WHERE id = 'e731775e-f41d-46c3-b671-74987c4905c4';

-- Verificar
SELECT 
    id,
    "contactPhone",
    is_bot_active,
    "botContext"
FROM chats
WHERE id = 'e731775e-f41d-46c3-b671-74987c4905c4';
