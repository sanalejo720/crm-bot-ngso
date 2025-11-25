import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  try {
    console.log('🌱 Iniciando seed de datos de prueba...\n');

    // Obtener usuarios existentes
    const users = await dataSource.query(`
      SELECT id, email, "fullName", "roleId" FROM users LIMIT 10
    `);

    console.log('📋 Usuarios encontrados:', users.length);
    
    const adminUser = users.find(u => u.email === 'admin@crm.com');
    const supervisorUser = users.find(u => u.email === 'juan@crm.com');
    const agentUser = users.find(u => u.email === 'laura@crm.com');

    if (!adminUser || !supervisorUser || !agentUser) {
      console.error('❌ No se encontraron los usuarios necesarios');
      return;
    }

    // Crear clientes de prueba
    console.log('\n📞 Creando clientes de prueba...');
    
    const clients = [
      {
        phone: '573001234567',
        fullName: 'Juan Perez',
        debtAmount: 5000000,
        daysOverdue: 45,
        status: 'customer',
      },
      {
        phone: '573007654321',
        fullName: 'Maria Garcia',
        debtAmount: 3500000,
        daysOverdue: 30,
        status: 'customer',
      },
      {
        phone: '573009876543',
        fullName: 'Carlos Lopez',
        debtAmount: 8000000,
        daysOverdue: 60,
        status: 'customer',
      },
    ];

    for (const client of clients) {
      const existing = await dataSource.query(
        'SELECT id FROM clients WHERE phone = $1',
        [client.phone],
      );

      if (existing.length === 0) {
        await dataSource.query(
          `INSERT INTO clients (id, phone, "fullName", "debtAmount", "daysOverdue", status, "createdAt", "updatedAt")
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), NOW())`,
          [client.phone, client.fullName, client.debtAmount, client.daysOverdue, client.status],
        );
        console.log(`  ✅ Cliente creado: ${client.fullName}`);
      } else {
        console.log(`  ⏭️  Cliente ya existe: ${client.fullName}`);
      }
    }

    // Crear campaña de prueba PRIMERO
    console.log('\n📢 Creando campaña de prueba...');

    const existingCampaign = await dataSource.query(
      `SELECT id FROM campaigns WHERE name = 'Campaña de Prueba'`,
    );

    let campaignId;
    if (existingCampaign.length === 0) {
      const campaignResult = await dataSource.query(
        `INSERT INTO campaigns (id, name, description, "startDate", "endDate", status, "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), NOW())
         RETURNING id`,
        [
          'Campaña de Prueba',
          'Campaña de cobranza para testing',
          new Date('2025-01-01'),
          new Date('2025-12-31'),
          'active',
        ],
      );
      campaignId = campaignResult[0].id;
      console.log('  ✅ Campaña creada');
    } else {
      campaignId = existingCampaign[0].id;
      console.log('  ⏭️  Campaña ya existe');
    }

    // Obtener o crear número de WhatsApp
    console.log('\n📱 Verificando número de WhatsApp...');
    let whatsappNumbers = await dataSource.query(
      'SELECT id FROM whatsapp_numbers LIMIT 1',
    );

    let whatsappNumberId;
    if (whatsappNumbers.length === 0) {
      console.log('  ⚠️  No hay números de WhatsApp, creando uno para testing...');
      const whatsappResult = await dataSource.query(
        `INSERT INTO whatsapp_numbers (id, phone, "displayName", provider, status, "campaignId", "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), '573001000000', 'Número de Prueba', 'evolution', 'active', $1, NOW(), NOW())
         RETURNING id`,
        [campaignId],
      );
      whatsappNumberId = whatsappResult[0].id;
      console.log('  ✅ Número de WhatsApp creado');
    } else {
      whatsappNumberId = whatsappNumbers[0].id;
      console.log('  ✅ Número de WhatsApp encontrado');
    }

    // Obtener IDs de clientes
    const clientIds = await dataSource.query(
      'SELECT id FROM clients LIMIT 3',
    );

    // Crear chats de prueba
    console.log('\n💬 Creando chats de prueba...');

    if (clientIds.length > 0) {
      const chats = [
        {
          clientId: clientIds[0].id,
          agentId: agentUser.id,
          externalId: `whatsapp_573001234567_${Date.now()}`,
          contactPhone: '573001234567',
          contactName: 'Juan Pérez',
          status: 'active',
          channel: 'whatsapp',
        },
        {
          clientId: clientIds[1]?.id || clientIds[0].id,
          agentId: agentUser.id,
          externalId: `whatsapp_573007654321_${Date.now() + 1}`,
          contactPhone: '573007654321',
          contactName: 'Maria Garcia',
          status: 'pending',
          channel: 'whatsapp',
        },
        {
          clientId: clientIds[2]?.id || clientIds[0].id,
          agentId: null,
          externalId: `whatsapp_573009876543_${Date.now() + 2}`,
          contactPhone: '573009876543',
          contactName: 'Carlos Lopez',
          status: 'waiting',
          channel: 'whatsapp',
        },
      ];

      for (const chat of chats) {
        const existing = await dataSource.query(
          'SELECT id FROM chats WHERE "clientId" = $1 AND status IN ($2, $3)',
          [chat.clientId, 'active', 'waiting'],
        );

        if (existing.length === 0) {
          const result = await dataSource.query(
            `INSERT INTO chats (id, "clientId", "assignedAgentId", "campaignId", "whatsappNumberId", "externalId", "contactPhone", "contactName", status, channel, "createdAt", "updatedAt")
             VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
             RETURNING id`,
            [chat.clientId, chat.agentId, campaignId, whatsappNumberId, chat.externalId, chat.contactPhone, chat.contactName, chat.status, chat.channel],
          );
          console.log(`  ✅ Chat creado: ${result[0].id}`);
        } else {
          console.log(`  ⏭️  Chat ya existe para cliente: ${chat.clientId}`);
        }
      }
    }

    console.log('\n✨ Seed completado exitosamente!\n');
    console.log('📊 Resumen:');
    console.log('  - Clientes: 3');
    console.log('  - Chats: 3');
    console.log('  - Campaña: 1');
    console.log('\n🎯 Ahora puedes ejecutar los tests con datos reales!\n');

  } catch (error) {
    console.error('❌ Error durante el seed:', error);
  } finally {
    await app.close();
  }
}

seed();
