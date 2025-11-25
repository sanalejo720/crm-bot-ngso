// Script para activar el usuario admin@crm.com
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'crm_ngso',
});

async function activateAdmin() {
  try {
    console.log('🔌 Conectando a la base de datos...');
    await AppDataSource.initialize();
    console.log('✅ Conectado exitosamente');

    console.log('🔄 Activando usuario admin@crm.com...');
    
    const result = await AppDataSource.query(
      `UPDATE users SET status = 'active' WHERE email = 'admin@crm.com' RETURNING id, "fullName", email, status`
    );

    if (result.length > 0) {
      console.log('✅ Usuario activado exitosamente:');
      console.log(result[0]);
    } else {
      console.log('⚠️ No se encontró el usuario admin@crm.com');
      
      // Listar todos los usuarios para verificar
      const allUsers = await AppDataSource.query(
        `SELECT id, "fullName", email, status FROM users LIMIT 5`
      );
      console.log('\n📋 Usuarios en la base de datos:');
      console.table(allUsers);
    }

    await AppDataSource.destroy();
    console.log('✅ Proceso completado');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

activateAdmin();
