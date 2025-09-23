'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('user_specializations', {
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      specialization_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Specializations',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
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

    // Add composite primary key to prevent duplicates
    await queryInterface.addConstraint('user_specializations', {
      fields: ['user_id', 'specialization_id'],
      type: 'primary key',
      name: 'pk_user_specializations',
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('user_specializations');
  }
};
