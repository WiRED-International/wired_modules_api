'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // ============================
    // 1. FIX exam_questions TABLE
    // ============================

    const examQuestions = await queryInterface.describeTable('exam_questions');

    // Add question_type
    if (!examQuestions.question_type) {
      await queryInterface.addColumn('exam_questions', 'question_type', {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'single'
      });
    }

    // Remove old incorrect single-answer column
    if (examQuestions.correct_answer) {
      await queryInterface.removeColumn('exam_questions', 'correct_answer');
    }

    // Add correct_answers (JSON array)
    if (!examQuestions.correct_answers) {
      await queryInterface.addColumn('exam_questions', 'correct_answers', {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: []
      });
    }

    // ======================================
    // 2. CLEAN UP exam_user_access TABLE
    // ======================================

    const examUserAccess = await queryInterface.describeTable('exam_user_access');

    // Remove available_from
    if (examUserAccess.available_from) {
      await queryInterface.removeColumn('exam_user_access', 'available_from');
    }

    // Remove available_until
    if (examUserAccess.available_until) {
      await queryInterface.removeColumn('exam_user_access', 'available_until');
    }

    // Remove reason
    if (examUserAccess.reason) {
      await queryInterface.removeColumn('exam_user_access', 'reason');
    }
  },

  async down(queryInterface, Sequelize) {
    // Reverse changes to exam_questions
    await queryInterface.removeColumn('exam_questions', 'correct_answers');

    await queryInterface.addColumn('exam_questions', 'correct_answer', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: ''
    });

    await queryInterface.removeColumn('exam_questions', 'question_type');

    // Reverse changes to exam_user_access
    await queryInterface.addColumn('exam_user_access', 'available_from', {
      type: Sequelize.DATE,
      allowNull: true
    });

    await queryInterface.addColumn('exam_user_access', 'available_until', {
      type: Sequelize.DATE,
      allowNull: true
    });

    await queryInterface.addColumn('exam_user_access', 'reason', {
      type: Sequelize.TEXT,
      allowNull: true
    });
  }
};
