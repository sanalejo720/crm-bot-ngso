SELECT id, name, type, config 
FROM bot_nodes 
WHERE config::text LIKE '%HX%' 
ORDER BY id;
