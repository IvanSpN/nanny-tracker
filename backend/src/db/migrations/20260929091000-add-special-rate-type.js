'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // ADD VALUE нельзя использовать в той же транзакции, поэтому без transaction.
    await queryInterface.sequelize.query(
      `ALTER TYPE "enum_work_sessions_rate_type" ADD VALUE IF NOT EXISTS 'special';`,
    );
  },

  async down() {
    // Postgres не умеет удалять значение enum без пересоздания типа — оставляем как есть.
  },
};
