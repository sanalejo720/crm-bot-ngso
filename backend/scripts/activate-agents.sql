-- Poner agentes en estado disponible
UPDATE users 
SET "agentState" = 'available', "isAgent" = true 
WHERE email IN ('juan@crm.com', 'laura@crm.com', 'pedro@crm.com');

-- Verificar
SELECT "fullName", email, "agentState", "isAgent", "maxConcurrentChats" 
FROM users 
WHERE email IN ('juan@crm.com', 'laura@crm.com', 'pedro@crm.com');
