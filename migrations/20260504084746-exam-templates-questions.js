'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('exam_template_questions', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      exam_template_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'exam_templates',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      question_type: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'single'
      },
      question_text: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      options: {
        type: Sequelize.JSON,
        allowNull: false
      },
      correct_answers: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: []
      },
      order: Sequelize.INTEGER,
      created_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.NOW
    },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.NOW
    }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('exam_template_questions');
  }
};