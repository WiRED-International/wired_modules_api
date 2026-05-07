'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('quiz_scores', 'score', {
      type: Sequelize.FLOAT,
      allowNull: false,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('quiz_scores', 'score', {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: false,
    });
  }
};
