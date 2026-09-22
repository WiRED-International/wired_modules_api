'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('class_enrollment_specializations', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },

      class_enrollment_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: {
          model: 'class_enrollments',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },

      specialization_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'specializations',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },

      selected_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },

      status: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'active',
      },

      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
      },

      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable(
      'class_enrollment_specializations'
    );
  },
};
