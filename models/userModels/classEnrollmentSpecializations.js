const { Model, DataTypes } = require('sequelize');

const sequelize = require('../../config/connection');

class ClassEnrollmentSpecializations extends Model {}

ClassEnrollmentSpecializations.init(
  {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
    },

    class_enrollment_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
    },

    specialization_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    selected_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },

    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'active',
    },
  },
  {
    sequelize,
    modelName: 'ClassEnrollmentSpecialization',
    tableName: 'class_enrollment_specializations',
    timestamps: true,
    freezeTableName: true,
    underscored: true,
  }
);

module.exports = ClassEnrollmentSpecializations;