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
    },
    program: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "Basic Training"
    },
    exam_type: {
      type: DataTypes.ENUM(
        'general',
        'basic_qualifying',
        'act_final',
        'specialization_final'
      ),
      allowNull: true,
      defaultValue: null,
    },
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