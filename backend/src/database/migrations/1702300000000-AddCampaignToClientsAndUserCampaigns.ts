import { MigrationInterface, QueryRunner, TableColumn, Table, TableForeignKey, TableIndex } from 'typeorm';

export class AddCampaignToClientsAndUserCampaigns1702300000000 implements MigrationInterface {
  name = 'AddCampaignToClientsAndUserCampaigns1702300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Agregar campaignId a clients
    await queryRunner.addColumn(
      'clients',
      new TableColumn({
        name: 'campaignId',
        type: 'uuid',
        isNullable: true,
      }),
    );

    // Crear índice para campaignId en clients
    await queryRunner.createIndex(
      'clients',
      new TableIndex({
        name: 'IDX_clients_campaignId',
        columnNames: ['campaignId'],
      }),
    );

    // Foreign key para clients.campaignId
    await queryRunner.createForeignKey(
      'clients',
      new TableForeignKey({
        name: 'FK_clients_campaign',
        columnNames: ['campaignId'],
        referencedTableName: 'campaigns',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    // 2. Crear tabla user_campaigns (muchos a muchos)
    await queryRunner.createTable(
      new Table({
        name: 'user_campaigns',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'userId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'campaignId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
          {
            name: 'isPrimary',
            type: 'boolean',
            default: false,
            comment: 'Indica si es la campaña principal del agente',
          },
          {
            name: 'assignedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
        indices: [
          {
            name: 'IDX_user_campaigns_userId',
            columnNames: ['userId'],
          },
          {
            name: 'IDX_user_campaigns_campaignId',
            columnNames: ['campaignId'],
          },
          {
            name: 'UQ_user_campaigns_user_campaign',
            columnNames: ['userId', 'campaignId'],
            isUnique: true,
          },
        ],
        foreignKeys: [
          {
            name: 'FK_user_campaigns_user',
            columnNames: ['userId'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            name: 'FK_user_campaigns_campaign',
            columnNames: ['campaignId'],
            referencedTableName: 'campaigns',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
    );

    // 3. Migrar datos existentes: Si un usuario tiene campaignId, crear registro en user_campaigns
    await queryRunner.query(`
      INSERT INTO user_campaigns ("userId", "campaignId", "isActive", "isPrimary", "assignedAt")
      SELECT id, "campaignId", true, true, CURRENT_TIMESTAMP
      FROM users
      WHERE "campaignId" IS NOT NULL
      ON CONFLICT DO NOTHING
    `);

    console.log('✅ Migración completada: campaignId agregado a clients y tabla user_campaigns creada');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Eliminar foreign key de clients
    await queryRunner.dropForeignKey('clients', 'FK_clients_campaign');
    
    // Eliminar índice de clients
    await queryRunner.dropIndex('clients', 'IDX_clients_campaignId');
    
    // Eliminar columna campaignId de clients
    await queryRunner.dropColumn('clients', 'campaignId');
    
    // Eliminar tabla user_campaigns
    await queryRunner.dropTable('user_campaigns');
  }
}
