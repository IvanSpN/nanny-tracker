'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        'users',
        'is_initial_password_changed',
        {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        { transaction },
      );

      await queryInterface.sequelize.query(
        `
          UPDATE users
          SET is_initial_password_changed = false
          WHERE role = 'client';
        `,
        { transaction },
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeColumn('users', 'is_initial_password_changed', {
        transaction,
      });
    });
  },
};
