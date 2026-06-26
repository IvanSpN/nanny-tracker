'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;', {
        transaction,
      });

      await queryInterface.createTable(
        'users',
        {
          id: {
            type: Sequelize.UUID,
            allowNull: false,
            primaryKey: true,
            defaultValue: Sequelize.literal('gen_random_uuid()'),
          },

          name: {
            type: Sequelize.STRING,
            allowNull: false,
          },

          email: {
            type: Sequelize.STRING,
            allowNull: false,
            unique: true,
          },

          password_hash: {
            type: Sequelize.STRING,
            allowNull: false,
          },

          role: {
            type: Sequelize.ENUM('worker', 'client'),
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

          deleted_at: {
            type: Sequelize.DATE,
            allowNull: true,
            defaultValue: null,
          },
        },
        { transaction },
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.dropTable('users', { transaction });

      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_users_role";', {
        transaction,
      });
    });
  },
};
