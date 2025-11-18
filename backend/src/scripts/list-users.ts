import { DataSource } from 'typeorm';

const ds = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'postgres',
  password: 'postgres123',
  database: 'crm_whatsapp'
});

ds.initialize()
  .then(async () => {
    const users = await ds.query(`
      SELECT u.id, u."fullName", u.email, r.name as role 
      FROM users u 
      JOIN roles r ON u."roleId" = r.id 
      ORDER BY r.name
    `);
    
    console.log('\n=== USUARIOS EN LA BASE DE DATOS ===\n');
    users.forEach((u: any) => {
      console.log(`${u.role.padEnd(15)} | ${u.email.padEnd(30)} | ${u.fullName}`);
    });
    
    await ds.destroy();
  })
  .catch(err => console.error('Error:', err.message));
