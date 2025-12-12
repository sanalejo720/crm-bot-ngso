const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'crm_admin',
  password: 'CRM_NgsoPass2024!',
  database: 'crm_whatsapp'
});

pool.query("SELECT * FROM backup_email_recipients")
  .then(r => { 
    console.log('Email recipients:', JSON.stringify(r.rows, null, 2)); 
    pool.end(); 
  })
  .catch(e => { 
    console.error('Error:', e.message); 
    pool.end(); 
  });
