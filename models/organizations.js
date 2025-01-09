const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/connection');

class Organizations extends Model {}

Organizations.init(
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
    city_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Cities',
        key: 'id',
      },
    },
  },
  {
    sequelize,
    modelName: 'Organizations',
    tableName: 'organizations',
    timestamps: false,
    freezeTableName: true,
    underscored: true,
  },
);

module.exports = Organizations;