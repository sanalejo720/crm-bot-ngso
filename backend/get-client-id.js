const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'crm_whatsapp',
  user: 'postgres',
  password: 'postgres123',
});

pool.query('SELECT id FROM clients WHERE "fullName" = $1', ['Alejandro Sandoval'])
  .then(r => {
    console.log(r.rows[0].id);
    pool.end();
  });
