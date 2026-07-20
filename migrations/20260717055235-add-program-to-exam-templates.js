'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {

    await queryInterface.addColumn(
      'exam_templates',
      'program',
      {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'Basic Training',
      }
    );

  },

  async down(queryInterface, Sequelize) {

    await queryInterface.removeColumn(
      'exam_templates',
      'program'
    );

  },
};
