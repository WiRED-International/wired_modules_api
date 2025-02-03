const { Model, DataTypes } = require('sequelize');
const sequelize = require('../../config/connection');

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
        model: 'countries',
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
    indexes: [
      {
        unique: true,
        fields: ["name", "country_id"], // alows duplicate city names, but only if they have unique country ids.  Name comparisons appear to be case-insensitive 
      },
    ],
  }
);

module.exports = Cities;