'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('modules', 'is_archived', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Archived modules are hidden from learners but retained for historical records',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('modules', 'is_archived');
  },
};
