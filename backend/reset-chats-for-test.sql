-- Limpiar chats para nueva prueba
UPDATE chats SET is_bot_active = false, "botContext" = NULL;

SELECT COUNT(*) as chats_reseteados FROM chats;
