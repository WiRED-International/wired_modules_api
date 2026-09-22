'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(
      'exam_templates',
      'exam_type',
      {
        type: Sequelize.ENUM(
          'general',
          'basic_qualifying',
          'act_final',
          'specialization_final'
        ),
        allowNull: true,
        defaultValue: null,
      }
    );
  },

  async down(queryInterface) {
    await queryInterface.removeColumn(
      'exam_templates',
      'exam_type'
    );
  },
};
