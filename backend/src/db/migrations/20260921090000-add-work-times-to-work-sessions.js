'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        'work_sessions',
        'start_time',
        {
          type: Sequelize.TIME,
          allowNull: true,
        },
        { transaction },
      );

      await queryInterface.addColumn(
        'work_sessions',
        'end_time',
        {
          type: Sequelize.TIME,
          allowNull: true,
        },
        { transaction },
      );

      await queryInterface.sequelize.query(
        `
          UPDATE work_sessions
          SET
            start_time = TIME '10:00',
            end_time = (TIME '10:00' + worked_minutes * INTERVAL '1 minute')::time
        `,
        { transaction },
      );

      await queryInterface.changeColumn(
        'work_sessions',
        'start_time',
        {
          type: Sequelize.TIME,
          allowNull: false,
        },
        { transaction },
      );

      await queryInterface.changeColumn(
        'work_sessions',
        'end_time',
        {
          type: Sequelize.TIME,
          allowNull: false,
        },
        { transaction },
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeColumn('work_sessions', 'end_time', { transaction });
      await queryInterface.removeColumn('work_sessions', 'start_time', { transaction });
    });
  },
};
