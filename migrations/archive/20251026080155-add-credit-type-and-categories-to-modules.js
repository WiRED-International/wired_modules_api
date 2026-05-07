'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('modules', 'credit_type', {
      type: Sequelize.ENUM('none', 'cme'),
      allowNull: false,
      defaultValue: 'cme',
    });

    await queryInterface.addColumn('modules', 'categories', {
      type: Sequelize.JSON,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('modules', 'credit_type');
    await queryInterface.removeColumn('modules', 'categories');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_modules_credit_type";');
  },
};
