const { Model, DataTypes } = require('sequelize');
const sequelize = require('../../config/connection');

class ExamTemplateQuestions extends Model {}

ExamTemplateQuestions.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },

    exam_template_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'exam_templates',
        key: 'id'
      },
      onDelete: 'CASCADE',
      field: 'exam_template_id'
    },

    question_type: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'single'
    },

    question_text: {
      type: DataTypes.TEXT,
      allowNull: false
    },

    options: {
      type: DataTypes.JSON,
      allowNull: false
    },

    correct_answers: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
      field: 'correct_answers'
    },

    order: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  },
  {
    sequelize,
    modelName: 'ExamTemplateQuestions',
    tableName: 'exam_template_questions',
    timestamps: true,
    freezeTableName: true,
    underscored: true
  }
);

// safety hook
ExamTemplateQuestions.beforeValidate((question) => {
  if (question.correct_answers == null) {
    question.correct_answers = [];
  }
});

module.exports = ExamTemplateQuestions;