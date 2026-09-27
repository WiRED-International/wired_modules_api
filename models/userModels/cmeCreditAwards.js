const { Model, DataTypes } = require('sequelize');
const sequelize = require('../../config/connection');

class CmeCreditAwards extends Model {}

CmeCreditAwards.init(
  {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
    },

    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },

    module_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'modules',
        key: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },

    year: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    credits_awarded: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    awarded_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: 'CmeCreditAwards',
    tableName: 'cme_credit_awards',
    timestamps: true,
    freezeTableName: true,
    underscored: true,

    indexes: [
      {
        unique: true,
        fields: ['user_id', 'module_id', 'year'],
        name: 'cme_credit_awards_user_module_year_unique',
      },
    ],
  }
);

module.exports = CmeCreditAwards;