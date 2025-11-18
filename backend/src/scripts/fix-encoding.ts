import { DataSource } from 'typeorm';

const ds = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'postgres',
  password: 'postgres123',
  database: 'crm_whatsapp'
});

const fixes = [
  { email: 'juan@crm.com', newName: 'Juan Pérez' },
  { email: 'laura@crm.com', newName: 'Laura Gómez' },
  { email: 'carlos@crm.com', newName: 'Carlos Ramírez' },
  { email: 'maria@crm.com', newName: 'María López' },
];

ds.initialize()
  .then(async () => {
    console.log('\n🔧 Corrigiendo nombres con encoding correcto...\n');
    
    for (const fix of fixes) {
      await ds.query(
        `UPDATE users SET "fullName" = $1 WHERE email = $2`,
        [fix.newName, fix.email]
      );
      console.log(`✅ ${fix.email.padEnd(20)} → ${fix.newName}`);
    }
    
    // Corregir clientes también
    const clientFixes = [
      { phone: '3001234567', newName: 'Patricia Gómez' },
      { phone: '573009876543', newName: 'María González' },
    ];
    
    console.log('\n🔧 Corrigiendo clientes...\n');
    for (const fix of clientFixes) {
      await ds.query(
        `UPDATE clients SET "fullName" = $1 WHERE phone = $2`,
        [fix.newName, fix.phone]
      );
      console.log(`✅ ${fix.phone.padEnd(20)} → ${fix.newName}`);
    }
    
    console.log('\n✅ Corrección completada\n');
    await ds.destroy();
  })
  .catch(err => console.error('Error:', err.message));
