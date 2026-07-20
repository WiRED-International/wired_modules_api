'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {

    await queryInterface.addColumn(
      'modules',
      'training_type',
      {
        type: Sequelize.ENUM(
          'basic',
          'act',
          'specialization'
        ),
        allowNull: true,
      }
    );

  },

  async down(queryInterface, Sequelize) {

    await queryInterface.removeColumn(
      'modules',
      'training_type'
    );

  },
};