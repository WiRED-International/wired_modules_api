const { Model, DataTypes } = require('sequelize');
const sequelize = require('../../config/connection');

class CmeCertificates extends Model {}

CmeCertificates.init(
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
    },

    year: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    sequence_number: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    certificate_id: {
      type: DataTypes.STRING(32),
      allowNull: false,
      unique: true,
    },

    issued_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
        pdf_path: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'CmeCertificates',
    tableName: 'cme_certificates',
    timestamps: false,        // explicit issued_at instead
    freezeTableName: true,
    underscored: true,
    
    // 🔐 HARD GUARANTEE: one certificate per user per year
    indexes: [
      {
        unique: true,
        fields: ['user_id', 'year'],
      },
    ],
  }
);

module.exports = CmeCertificates;

