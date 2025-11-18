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
    const user = await ds.query(`
      SELECT u."fullName", u.email, r.name as role 
      FROM users u 
      JOIN roles r ON u."roleId" = r.id 
      WHERE u.email = 'admin@crm.com'
    `);
    
    console.log('\n=== Usuario Admin ===');
    console.log('Nombre:', user[0].fullName);
    console.log('Email:', user[0].email);
    console.log('Rol:', user[0].role);
    
    await ds.destroy();
  })
  .catch(err => console.error('Error:', err.message));
