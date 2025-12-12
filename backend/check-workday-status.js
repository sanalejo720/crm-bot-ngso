const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'crm_whatsapp',
  user: 'crm_admin',
  password: 'CRM_NgsoPass2024!'
});

async function checkWorkdayStatus() {
  try {
    // Verificar workday
    const workdayQuery = `
      SELECT id, "agentId", "workDate", "clockInTime", "currentStatus", 
             "totalWorkMinutes", "totalPauseMinutes"
      FROM agent_workdays 
      WHERE "agentId" = 'ef9e9222-ceeb-4b43-a52d-041264ff961c' 
        AND "workDate" = CURRENT_DATE
    `;
    const workdayResult = await pool.query(workdayQuery);
    console.log('📅 Workday:', JSON.stringify(workdayResult.rows, null, 2));

    // Verificar pausas activas
    const pausesQuery = `
      SELECT id, "workdayId", "pauseType", "startTime", "endTime"
      FROM agent_pauses
      WHERE "workdayId" = (
        SELECT id FROM agent_workdays 
        WHERE "agentId" = 'ef9e9222-ceeb-4b43-a52d-041264ff961c' 
          AND "workDate" = CURRENT_DATE
      )
      ORDER BY "startTime" DESC
      LIMIT 5
    `;
    const pausesResult = await pool.query(pausesQuery);
    console.log('⏸️ Pausas:', JSON.stringify(pausesResult.rows, null, 2));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkWorkdayStatus();
