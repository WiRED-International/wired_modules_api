const { Model, DataTypes } = require('sequelize');
const sequelize = require('../../config/connection');

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
        model: 'countries',
        key: 'id',
      },
    },
    city_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'cities',
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
    indexes: [
      {
        unique: true,
        fields: ['name', 'country_id', 'city_id'], // Allows organizations to have duplicate names, but not if they have the same country_id and city_id as an existing entry
      },
    ],
  },
);

module.exports = Organizations;