const { Model, DataTypes } = require('sequelize');
const sequelize = require('../../config/connection');

class ExamQuestions extends Model {}

ExamQuestions.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    exam_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'exams',
        key: 'id'
      },
      onDelete: 'CASCADE',
      field: "exam_id"
    },
    question_type: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'single' // 'single' or 'multiple'
    },
    question_text: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    options: {
      type: DataTypes.JSON,
      allowNull: false
      // Example: { "a": "Option A", "b": "Option B", "c": "Option C", "d": "Option D" }
    },
    correct_answers: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
      field: 'correct_answers',
      // Example: ["a", "c", "d", "e"]
    },
    order: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  },
  {
    sequelize,
    modelName: 'ExamQuestions',
    tableName: 'exam_questions',
    timestamps: true,
    freezeTableName: true,
    underscored: true
  }
);

// ✅ SAFETY HOOK: guarantees correct_answers is never null before insert/update
ExamQuestions.beforeValidate((question) => {
  if (question.correct_answers == null) {
    question.correct_answers = [];
  }
});

module.exports = ExamQuestions;
