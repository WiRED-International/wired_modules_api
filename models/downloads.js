const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/connection');

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
    latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: false,
    },
    longitude: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: false,
    },

  },
  {
    sequelize,
    modelName: 'Downloads',
    tableName: 'downloads',
    timestamps: true,
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