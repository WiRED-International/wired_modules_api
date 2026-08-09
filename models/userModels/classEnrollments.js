const { Model, DataTypes } = require('sequelize');
const sequelize = require('../../config/connection');

class ClassEnrollments extends Model {}

ClassEnrollments.init(
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
    },

    class_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'classes',
        key: 'id',
      },
    },
    // enrolled | active | completed | withdrawn | dropped
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'enrolled',
    },

    enrolled_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: 'ClassEnrollments',
    tableName: 'class_enrollments',
    timestamps: true,
    freezeTableName: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['user_id', 'class_id'],
      },
    ],
  },
);

module.exports = ClassEnrollments;