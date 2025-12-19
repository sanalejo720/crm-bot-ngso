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

  // Total de deudores
  const total = await client.query('SELECT COUNT(*) FROM debtors');
  console.log('Total deudores:', total.rows[0].count);

  // Deudores por campaña
  const counts = await client.query(`
    SELECT c.name, COUNT(d.id) as count
    FROM debtors d
    LEFT JOIN campaigns c ON d."campaignId" = c.id
    GROUP BY c.name
  `);
  console.log('\n=== DEUDORES POR CAMPAÑA ===');
  counts.rows.forEach(r => console.log(`${r.name}: ${r.count}`));

  // Buscar deudor 71707874
  const search = await client.query(`SELECT id, "documentNumber", "fullName", "campaignId" FROM debtors WHERE "documentNumber" = '71707874'`);
  console.log('\n=== BÚSQUEDA 71707874 ===');
  console.log(search.rows.length > 0 ? search.rows : 'NO ENCONTRADO');

  // Ver algunos deudores de desocupados
  const desocupados = await client.query(`SELECT "documentNumber", "fullName" FROM debtors WHERE "campaignId" = '770147b5-b93b-4859-9392-0eedc9ffda0a' ORDER BY "createdAt" ASC LIMIT 10`);
  console.log('\n=== Primeros 10 deudores de Desocupados (orden creación) ===');
  console.log(desocupados.rows);

  // Ver los primeros documentNumbers cargados
  const firstDocs = await client.query(`SELECT "documentNumber", "fullName" FROM debtors WHERE "campaignId" = '770147b5-b93b-4859-9392-0eedc9ffda0a' AND "documentNumber" IN ('71707874', '1144041656', '1053814012', '52756447', '80543811')`);
  console.log('\n=== Búsqueda de primeros 5 docs del Excel ===');
  console.log(firstDocs.rows);

  await client.end();
}

main().catch(console.error);
