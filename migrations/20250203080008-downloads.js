'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('downloads', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
      },
      module_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'modules',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      package_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'packages',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      latitude: {
        type: Sequelize.DECIMAL(10, 8),
        allowNull: false,
      },
      longitude: {
        type: Sequelize.DECIMAL(11, 8),
        allowNull: false,
      },
      download_date: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        onUpdate: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Add a constraint to ensure at least one of module_id or package_id is provided
    await queryInterface.addConstraint('downloads', {
      fields: ['module_id', 'package_id'],
      type: 'check',
      where: {
        [Sequelize.Op.or]: [
          { module_id: { [Sequelize.Op.ne]: null } },
          { package_id: { [Sequelize.Op.ne]: null } },
        ],
      },
      name: 'downloads_module_or_package_required',
    });
  },


  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('downloads');
  }
};
