const { Client } = require('pg');

async function main() {
  const client = new Client({
    host: 'localhost',
    database: 'crm_whatsapp',
    user: 'crm_admin',
    password: 'CRM_NgsoPass2024!',
    port: 5432,
  });

  await client.connect();
  
  // Ver cuántos deudores hay actualmente por campaña
  const counts = await client.query(`
    SELECT c.name, COUNT(d.id) as count
    FROM debtors d
    LEFT JOIN campaigns c ON d."campaignId" = c.id
    GROUP BY c.name
  `);
  console.log('=== DEUDORES POR CAMPAÑA ===');
  counts.rows.forEach(r => console.log(`${r.name}: ${r.count}`));
  
  // Ver total
  const total = await client.query('SELECT COUNT(*) FROM debtors');
  console.log('\nTotal deudores:', total.rows[0].count);
  
  // Borrar todos los deudores para recargar
  console.log('\n⚠️ Borrando todos los deudores para recargar...');
  await client.query('DELETE FROM debtors');
  console.log('✅ Deudores borrados');
  
  await client.end();
}

main().catch(console.error);
