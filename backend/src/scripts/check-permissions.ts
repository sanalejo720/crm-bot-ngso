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
    const result = await ds.query(`
      SELECT r.name as role, COUNT(rp."permissionId") as permisos
      FROM roles r
      LEFT JOIN role_permissions rp ON r.id = rp."roleId"
      GROUP BY r.id, r.name
      ORDER BY r.name
    `);
    
    console.log('\n=== PERMISOS POR ROL ===\n');
    result.forEach((r: any) => {
      console.log(`${r.role.padEnd(20)} → ${r.permisos} permisos`);
    });
    
    // Ver permisos específicos del Super Admin
    const adminPerms = await ds.query(`
      SELECT p.module, p.action
      FROM roles r
      JOIN role_permissions rp ON r.id = rp."roleId"
      JOIN permissions p ON rp."permissionId" = p.id
      WHERE r.name = 'Super Admin'
      ORDER BY p.module, p.action
    `);
    
    console.log('\n=== PERMISOS DE SUPER ADMIN ===\n');
    if (adminPerms.length === 0) {
      console.log('⚠️  Super Admin NO TIENE PERMISOS asignados');
    } else {
      adminPerms.forEach((p: any) => {
        console.log(`  - ${p.module}.${p.action}`);
      });
    }
    
    await ds.destroy();
  })
  .catch(err => console.error('Error:', err.message));
