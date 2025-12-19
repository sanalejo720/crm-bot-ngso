'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('pending_agent_assignments', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      phone: {
        type: Sequelize.STRING(20),
        allowNull: false,
        comment: 'Número de teléfono del cliente (incluye código de país)',
      },
      agent_email: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Email del agente que envió el mensaje',
      },
      campaign_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'mass_campaigns',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'ID de la campaña masiva',
      },
      template_sid: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'SID de la plantilla utilizada',
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: 'Fecha de expiración de la asignación (7 días por defecto)',
      },
      assigned: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Indica si ya se asignó el chat al agente',
      },
      assigned_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Fecha en que se asignó el chat',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Índice para búsqueda rápida por teléfono
    await queryInterface.addIndex('pending_agent_assignments', ['phone'], {
      name: 'idx_pending_assignments_phone',
    });

    // Índice para búsqueda de asignaciones no expiradas
    await queryInterface.addIndex('pending_agent_assignments', ['expires_at', 'assigned'], {
      name: 'idx_pending_assignments_active',
    });

    // Índice para email del agente
    await queryInterface.addIndex('pending_agent_assignments', ['agent_email'], {
      name: 'idx_pending_assignments_agent',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('pending_agent_assignments');
  },
};
