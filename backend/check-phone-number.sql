-- Check chat and phone details
SELECT 
    c.id,
    c."contactPhone",
    c."contactName",
    c."externalId",
    wn."sessionName",
    wn."phoneNumber" as whatsapp_number
FROM chats c
LEFT JOIN whatsapp_numbers wn ON c."whatsappNumberId" = wn.id
WHERE c.id = 'e731775e-f41d-46c3-b671-74987c4905c4';

-- Check if this phone appears in other records
SELECT COUNT(*) as chat_count, "contactPhone"
FROM chats
WHERE "contactPhone" LIKE '%126818170482726%'
GROUP BY "contactPhone";
