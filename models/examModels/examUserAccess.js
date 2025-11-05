const { Model, DataTypes } = require('sequelize');
const sequelize = require('../../config/connection');

class ExamUserAccess extends Model {}

ExamUserAccess.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    exam_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'exams',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    max_attempts: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 1,
    },
    granted_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
  },
  {
    sequelize,
    modelName: 'ExamUserAccess',
    tableName: 'exam_user_access',
    timestamps: true,
    freezeTableName: true,
    underscored: true,
  }
);

module.exports = ExamUserAccess;