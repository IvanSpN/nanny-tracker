'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        'client_special_days',
        {
          id: {
            type: Sequelize.UUID,
            allowNull: false,
            primaryKey: true,
            defaultValue: Sequelize.literal('gen_random_uuid()'),
          },

          client_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: 'clients',
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },

          weekday: {
            type: Sequelize.SMALLINT,
            allowNull: false,
          },

          rate: {
            type: Sequelize.DECIMAL(12, 2),
            allowNull: false,
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
        },
        { transaction },
      );

      await queryInterface.addConstraint('client_special_days', {
        fields: ['client_id', 'weekday'],
        type: 'unique',
        name: 'client_special_days_client_weekday_unique',
        transaction,
      });

      await queryInterface.addConstraint('client_special_days', {
        fields: ['weekday'],
        type: 'check',
        where: {
          weekday: {
            [Sequelize.Op.between]: [1, 7],
          },
        },
        name: 'client_special_days_weekday_check',
        transaction,
      });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.dropTable('client_special_days', { transaction });
    });
  },
};
