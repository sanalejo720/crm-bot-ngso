const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'crm_whatsapp',
  user: 'crm_admin',
  password: 'CRM_NgsoPass2024!'
});

async function fixWorkdayStatus() {
  try {
    // Terminar la pausa activa anterior
    const endPauseQuery = `
      UPDATE agent_pauses 
      SET "endTime" = NOW()
      WHERE "workdayId" = '66c0a58b-f34b-4303-8ae6-936c05acf3d3'
        AND "endTime" IS NULL
    `;
    const endResult = await pool.query(endPauseQuery);
    console.log('✅ Pausas terminadas:', endResult.rowCount);

    console.log('✅ Pausa terminada. Intenta iniciar una nueva pausa desde el panel.');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

fixWorkdayStatus();
