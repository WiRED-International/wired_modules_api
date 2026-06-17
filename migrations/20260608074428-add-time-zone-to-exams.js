'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {

    await queryInterface.addColumn(
      'exams',
      'time_zone',
      {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'Africa/Nairobi',
      }
    );

  },

  async down(queryInterface, Sequelize) {

    await queryInterface.removeColumn(
      'exams',
      'time_zone'
    );

  },
};
