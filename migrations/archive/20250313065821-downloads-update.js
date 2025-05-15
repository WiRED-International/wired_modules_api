'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('downloads', 'country_code', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn('downloads', 'country_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'countries',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    await queryInterface.changeColumn('downloads', 'latitude', {
      type: Sequelize.DECIMAL(10, 8),
      allowNull: true,
    });

    await queryInterface.changeColumn('downloads', 'longitude', {
      type: Sequelize.DECIMAL(11, 8),
      allowNull: true,
    });

    await queryInterface.changeColumn('downloads', 'download_date', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: Math.floor(Date.now() / 1000),
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('downloads', 'country_code');
    await queryInterface.removeColumn('downloads', 'country_id');

    await queryInterface.changeColumn('downloads', 'latitude', {
      type: Sequelize.DECIMAL(10, 8),
      allowNull: false,
    });

    await queryInterface.changeColumn('downloads', 'longitude', {
      type: Sequelize.DECIMAL(11, 8),
      allowNull: false,
    });

    await queryInterface.changeColumn('downloads', 'download_date', {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.NOW,
    });
  }
};
