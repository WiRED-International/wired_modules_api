const { Model, DataTypes } = require('sequelize');
const sequelize = require('../../config/connection');

class CmeCreditBalances extends Model {}

CmeCreditBalances.init(
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

    year: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    opening_credits: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'CME credits earned before the CME award ledger became active',
    },
  },
  {
    sequelize,
    modelName: 'CmeCreditBalances',
    tableName: 'cme_credit_balances',
    timestamps: true,
    freezeTableName: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['user_id', 'year'],
        name: 'cme_credit_balances_user_year_unique',
      },
    ],
  }
);

module.exports = CmeCreditBalances;