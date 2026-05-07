const { Model, DataTypes } = require('sequelize');
const sequelize = require('../../config/connection');

class ExamTemplates extends Model {}

ExamTemplates.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  },
  {
    sequelize,
    modelName: 'ExamTemplates',
    tableName: 'exam_templates',
    timestamps: true,
    freezeTableName: true,
    underscored: true
  }
);

module.exports = ExamTemplates;