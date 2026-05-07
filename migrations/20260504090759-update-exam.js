'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('exams', 'exam_template_id', {
      type: Sequelize.INTEGER,
      allowNull: true, // keep nullable for now
      references: {
        model: 'exam_templates',
        key: 'id'
      },
      onDelete: 'SET NULL'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('exams', 'exam_template_id');
  }
};
