const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/connection');

class Admins extends Model {}

Admins.init(
  {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
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
    organization_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Organizations',
        key: 'id',
      },
    },
  },
  {
    sequelize,
    modelName: 'Admins',
    tableName: 'admins',
    timestamps: true,
    freezeTableName: true,
    underscored: true,
  },
);

module.exports = Admins;