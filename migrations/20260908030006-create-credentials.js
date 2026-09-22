'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('credentials', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },

      credential_number: {
        type: Sequelize.STRING(32),
        allowNull: false,
        unique: true,
      },

      credential_type: {
        type: Sequelize.ENUM(
          'basic',
          'act',
          'specialization'
        ),
        allowNull: false,
      },

      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },

      class_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'classes',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },

      program_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'programs',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },

      specialization_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'specializations',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },

      wired_user_id_snapshot: {
        type: Sequelize.STRING(16),
        allowNull: false,
      },

      student_name_snapshot: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },

      class_name_snapshot: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },

      awarded_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },

      exam_session_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'exam_sessions',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },

      exam_score_snapshot: {
        type: Sequelize.FLOAT,
        allowNull: false,
      },

      exam_completed_at_snapshot: {
        type: Sequelize.DATE,
        allowNull: false,
      },

      requirements_snapshot: {
        type: Sequelize.JSON,
        allowNull: false,
      },

      status: {
        type: Sequelize.ENUM('awarded', 'revoked'),
        allowNull: false,
        defaultValue: 'awarded',
      },

      revoked_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },

      revoked_by_user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },

      revocation_reason: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },

      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('credentials', {
      fields: ['user_id', 'class_id', 'credential_type'],
      unique: true,
      name: 'credentials_user_class_type_unique',
    });

    await queryInterface.addIndex('credentials', {
      fields: ['user_id'],
      name: 'credentials_user_id_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('credentials');
  },
};
