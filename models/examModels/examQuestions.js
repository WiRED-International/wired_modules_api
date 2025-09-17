const { Model, DataTypes } = require('sequelize');
const sequelize = require('../../config/connection');

class ExamQuestions extends Model {};

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
      onDelete: 'CASCADE'
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
    correct_answer: {
      type: DataTypes.STRING,
      allowNull: false
      // e.g., "b"
    },
    order: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
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

module.exports = ExamQuestions;
