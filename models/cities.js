const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/connection');

class Cities extends Model {}

Cities.init(
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
    },
    country_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Countries',
        key: 'id',
      },
    },
  },
  {
    sequelize,
    modelName: 'Cities',
    tableName: 'cities',
    timestamps: false,
    freezeTableName: true,
    underscored: true,
  }
);

module.exports = Cities;