const { Model, DataTypes } = require('sequelize');
const sequelize = require('../../config/connection');

class Locations extends Model {}

Locations.init(
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
      allowNull: false,
      references: {
        model: 'countries',
        key: 'id',
      },
    },

    location_type: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [[
          'county',
          'sub_county',
          'city',
        ]],
      },
    },

    parent_location_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'locations',
        key: 'id',
      },
    },
  },
  {
    sequelize,
    modelName: 'Locations',
    tableName: 'locations',
    timestamps: true,
    freezeTableName: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: [
          'name',
          'country_id',
          'location_type',
          'parent_location_id',
        ],
      },
    ],
  },
);

module.exports = Locations;