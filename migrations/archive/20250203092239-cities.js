'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('cities', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      country_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'countries', // Make sure your table name is correctly referenced
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL', // Optional: Choose behavior when a country is deleted
      },
    });

    // Add a composite unique index for name and country_id
    await queryInterface.addIndex('cities', ['name', 'country_id'], {
      unique: true,
      name: 'cities_name_country_id_unique',
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('cities');
  }
};
