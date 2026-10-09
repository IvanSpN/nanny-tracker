'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        'refresh_tokens',
        {
          id: {
            type: Sequelize.UUID,
            allowNull: false,
            primaryKey: true,
            defaultValue: Sequelize.literal('gen_random_uuid()'),
          },

          user_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: 'users',
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },

          token_hash: {
            type: Sequelize.STRING(64),
            allowNull: false,
          },

          expires_at: {
            type: Sequelize.DATE,
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

      await queryInterface.addIndex('refresh_tokens', ['token_hash'], {
        name: 'refresh_tokens_token_hash_unique',
        unique: true,
        transaction,
      });

      await queryInterface.addIndex('refresh_tokens', ['user_id'], {
        name: 'refresh_tokens_user_id_index',
        transaction,
      });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.dropTable('refresh_tokens', { transaction });
    });
  },
};
