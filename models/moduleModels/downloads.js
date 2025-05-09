const { Model, DataTypes } = require('sequelize');
const sequelize = require('../../config/connection');

class Downloads extends Model {}

Downloads.init(
  {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
    },
    module_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'modules',
        key: 'id',
      },
    },
    package_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'packages',
        key: 'id',
      },
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true, // This field is not required, as the user may not be logged in
      references: {
        model: 'users',
        key: 'id',
      },
    },
    //apparently sequelize stores decimals as strings to prevent rounding errors, so they still need to be parsed as floats

    latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true,
    },
    longitude: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: true,
    },
    download_date: {
      type: DataTypes.INTEGER, // Store Unix timestamp as an integer
      allowNull: false,
      defaultValue: () => Math.floor(Date.now() / 1000), // Default value is the current Unix timestamp
    },
    country_code: {
      type: DataTypes.STRING,
      allowNull: true,
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
    modelName: 'Downloads',
    tableName: 'downloads',
    timestamps: false,
    freezeTableName: true,
    underscored: true, 
    validate: {
      // Custom validation to ensure at least ONE of the fields is provided for module_id or package_id
      atLeastOneField() {
        if (!this.module_id && !this.package_id) {
          throw new Error('Either module_id or package_id must be provided.');
        }
      },
    },
  }
);

module.exports = Downloads;