'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('modules', 'type', {
      type: Sequelize.ENUM('module', 'animation'),
      allowNull: false,
      defaultValue: 'module',
    });
  },

  async down(queryInterface, Sequelize) {
    // First, drop the ENUM type before removing the column
    await queryInterface.removeColumn('modules', 'type');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_modules_type";');
  }
};
