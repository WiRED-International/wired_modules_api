const { Model, DataTypes } = require('sequelize');
const sequelize = require('../../config/connection');

class AdminPermissions extends Model {}

AdminPermissions.init(
  {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
    },
    admin_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id',
      },
      onDelete: 'CASCADE',
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
      organization_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'organizations', 
          key: 'id',
        },
    },
  },
  {
    sequelize,
    modelName: 'AdminPermissions',
    tableName: 'admin_permissions',
    timestamps: false,
    freezeTableName: true,
    underscored: true,
  },
);

module.exports = AdminPermissions;