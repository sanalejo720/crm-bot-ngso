const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'crm_whatsapp',
  user: 'postgres',
  password: 'postgres123',
});

pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position")
  .then(r => {
    console.log('Columnas de users:');
    console.log(r.rows.map(x => x.column_name).join(', '));
    return pool.query("SELECT * FROM users LIMIT 3");
  })
  .then(r => {
    console.log('\nUsuarios:');
    console.log(r.rows);
    pool.end();
  })
  .catch(e => {
    console.error(e);
    pool.end();
  });
