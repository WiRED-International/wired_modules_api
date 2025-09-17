const { Model, DataTypes } = require('sequelize');
const sequelize = require('../../config/connection');

class Exams extends Model {}

Exams.init(
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
  },
  {
    sequelize,
    modelName: 'Exams',
    tableName: 'exams',
    timestamps: true,
    freezeTableName: true,
    underscored: true
  }
);

module.exports = Exams;
