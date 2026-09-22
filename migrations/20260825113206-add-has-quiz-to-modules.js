'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(
      'modules',
      'has_quiz',
      {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      }
    );
  },

  async down(queryInterface) {
    await queryInterface.removeColumn(
      'modules',
      'has_quiz'
    );
  },
};