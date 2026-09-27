'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('modules', 'cme_credits', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 5,
      comment: 'Number of CME credits awarded when the module is passed',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('modules', 'cme_credits');
  },
};
