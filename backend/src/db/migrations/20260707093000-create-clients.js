'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        'clients',
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

          user_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: 'users',
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'RESTRICT',
          },

          name: {
            type: Sequelize.STRING,
            allowNull: false,
          },

          regular_rate: {
            type: Sequelize.DECIMAL(12, 2),
            allowNull: false,
          },

          weekend_rate: {
            type: Sequelize.DECIMAL(12, 2),
            allowNull: true,
            defaultValue: null,
          },

          phone: {
            type: Sequelize.STRING,
            allowNull: true,
            defaultValue: null,
          },

          notes: {
            type: Sequelize.TEXT,
            allowNull: true,
            defaultValue: null,
          },

          is_active: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: true,
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

      await queryInterface.addIndex('clients', ['worker_id'], {
        name: 'clients_worker_id_index',
        transaction,
      });

      await queryInterface.addConstraint('clients', {
        fields: ['user_id'],
        type: 'unique',
        name: 'clients_user_id_unique',
        transaction,
      });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.dropTable('clients', { transaction });
    });
  },
};
