const { Model, DataTypes } = require('sequelize');
const sequelize = require('../../config/connection');

class Credentials extends Model {}

Credentials.init(
  {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
    },

    credential_number: {
      type: DataTypes.STRING(32),
      allowNull: false,
      unique: true,
    },

    credential_type: {
      type: DataTypes.ENUM('basic', 'act', 'specialization'),
      allowNull: false,
    },

    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    },

    class_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'classes', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    },

    program_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'programs', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    },

    specialization_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'specializations', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    },

    wired_user_id_snapshot: {
      type: DataTypes.STRING(16),
      allowNull: false,
    },

    student_name_snapshot: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },

    class_name_snapshot: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },

    awarded_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },

    exam_session_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'exam_sessions', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },

    exam_score_snapshot: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },

    exam_completed_at_snapshot: {
      type: DataTypes.DATE,
      allowNull: false,
    },

    requirements_snapshot: {
      type: DataTypes.JSON,
      allowNull: false,
    },

    status: {
      type: DataTypes.ENUM('awarded', 'revoked'),
      allowNull: false,
      defaultValue: 'awarded',
    },

    revoked_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    revoked_by_user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },

    revocation_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'Credentials',
    tableName: 'credentials',
    timestamps: true,
    freezeTableName: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['user_id', 'class_id', 'credential_type'],
        name: 'credentials_user_class_type_unique',
      },
      {
        fields: ['user_id'],
        name: 'credentials_user_id_idx',
      },
    ],
  }
);

module.exports = Credentials;