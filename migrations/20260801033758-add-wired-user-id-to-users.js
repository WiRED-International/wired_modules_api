'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {

    await queryInterface.addColumn('users', 'wired_user_id', {
      type: Sequelize.STRING(16),
      allowNull: true,
      unique: true,
    });

  },

  async down(queryInterface, Sequelize) {

    await queryInterface.removeColumn('users', 'wired_user_id');

  }
};
