'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        'work_sessions',
        {
          id: {
            type: Sequelize.UUID,
            allowNull: false,
            primaryKey: true,
            defaultValue: Sequelize.literal('gen_random_uuid()'),
          },

          worker_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: 'workers',
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'RESTRICT',
          },

          client_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: 'clients',
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'RESTRICT',
          },

          work_date: {
            type: Sequelize.DATEONLY,
            allowNull: false,
          },

          worked_minutes: {
            type: Sequelize.INTEGER,
            allowNull: false,
          },

          rate_type: {
            type: Sequelize.ENUM('regular', 'weekend'),
            allowNull: false,
          },

          rate_value: {
            type: Sequelize.DECIMAL(12, 2),
            allowNull: false,
          },

          amount: {
            type: Sequelize.DECIMAL(12, 2),
            allowNull: false,
          },

          comment: {
            type: Sequelize.TEXT,
            allowNull: true,
            defaultValue: null,
          },

          status: {
            type: Sequelize.ENUM('pending', 'confirmed', 'rejected'),
            allowNull: false,
            defaultValue: 'pending',
          },

          confirmed_at: {
            type: Sequelize.DATE,
            allowNull: true,
            defaultValue: null,
          },

          created_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.fn('NOW'),
          },

          updated_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.fn('NOW'),
          },

          deleted_at: {
            type: Sequelize.DATE,
            allowNull: true,
            defaultValue: null,
          },
        },
        { transaction },
      );

      await queryInterface.addIndex('work_sessions', ['worker_id'], {
        name: 'work_sessions_worker_id_index',
        transaction,
      });

      await queryInterface.addIndex('work_sessions', ['client_id'], {
        name: 'work_sessions_client_id_index',
        transaction,
      });

      await queryInterface.addIndex('work_sessions', ['worker_id', 'work_date'], {
        name: 'work_sessions_worker_date_index',
        transaction,
      });

      await queryInterface.addIndex('work_sessions', ['client_id', 'work_date'], {
        name: 'work_sessions_client_date_index',
        transaction,
      });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.dropTable('work_sessions', { transaction });

      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_work_sessions_rate_type";', {
        transaction,
      });

      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_work_sessions_status";', {
        transaction,
      });
    });
  },
};
