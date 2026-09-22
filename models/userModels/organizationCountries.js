const { Model, DataTypes } = require('sequelize');

const sequelize = require('../../config/connection');

class OrganizationCountries extends Model {}

OrganizationCountries.init(
  {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
    },

    organization_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'organizations',
        key: 'id',
      },
    },

    country_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'countries',
        key: 'id',
      },
    },
  },
  {
    sequelize,
    modelName: 'OrganizationCountries',
    tableName: 'organization_countries',

    // The existing table uses createdAt / updatedAt,
    // not created_at / updated_at.
    timestamps: true,
    underscored: false,

    freezeTableName: true,
  }
);

module.exports = OrganizationCountries;