'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('cme_certificates', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },

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

      year: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },

      sequence_number: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },

      certificate_id: {
        type: Sequelize.STRING(32),
        allowNull: false,
        unique: true,
      },

      issued_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },

      pdf_path: {
        type: Sequelize.STRING,
        allowNull: true,
      },
    });

    // 🔐 One certificate per user per year
    await queryInterface.addIndex(
      'cme_certificates',
      ['user_id', 'year'],
      {
        unique: true,
        name: 'unique_user_year_certificate',
      }
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('cme_certificates');
  },
};