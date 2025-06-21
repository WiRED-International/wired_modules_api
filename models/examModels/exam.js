const { Model, DataTypes } = require('sequelize');
const sequelize = require('../../config/connection');

class Exam extends Model {}

Exam.init(
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
      type: DataTypes.TEXT
    },
    available_from: {
      type: DataTypes.DATE,
      allowNull: false
    },
    available_until: {
      type: DataTypes.DATE,
      allowNull: false
    },
    duration_minutes: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false
    }
  },
  {
    sequelize,
    modelName: 'Exam',
    tableName: 'exam',
    timestamps: true,
    freezeTableName: true,
    underscored: true
  }
);

module.exports = Exam;
