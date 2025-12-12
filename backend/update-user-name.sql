-- Actualizar nombre del agente
UPDATE users
SET "fullName" = 'Agente Prueba'
WHERE email = 'a.prueba1@prueba.com';

-- Verificar
SELECT id, email, "fullName", "agentState", "isAgent"
FROM users
WHERE email = 'a.prueba1@prueba.com';
