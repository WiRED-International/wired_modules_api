'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    await queryInterface.removeColumn('modules', 'letters');
    await queryInterface.removeColumn('modules', 'is_downloadable');
    await queryInterface.addColumn('alerts', 'important', {
      type: Sequelize.BOOLEAN,
      allowNull: true,
    });
    await queryInterface.addColumn('modules', 'language', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  async down (queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    await queryInterface.addColumn('modules', 'letters', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('modules', 'is_downloadable', {
      type: Sequelize.BOOLEAN,
      allowNull: true,
    });
    await queryInterface.removeColumn('alerts', 'important');
    await queryInterface.removeColumn('modules', 'language');
  }
};
