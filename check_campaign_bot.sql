SELECT 
    id, 
    name, 
    settings->'botEnabled' as bot_enabled, 
    settings->'botFlowId' as bot_flow_id,
    settings
FROM campaigns 
WHERE id = 'ff329fdd-f49d-4292-afc4-14197a440807';
