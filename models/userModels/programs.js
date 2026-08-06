const { Model, DataTypes } = require('sequelize');
const sequelize = require('../../config/connection');

class Programs extends Model {}

Programs.init(
  {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
    },

    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },

    training_type: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },

    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    sequelize,
    modelName: 'Programs',
    tableName: 'programs',
    timestamps: true,
    freezeTableName: true,
    underscored: true,
  },
);

module.exports = Programs;