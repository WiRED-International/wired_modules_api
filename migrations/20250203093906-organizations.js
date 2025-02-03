'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('organizations', {
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
          model: 'countries', // Ensure the referenced table name matches exactly
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL', // If a country is deleted, the organization remains but the country_id is set to NULL
      },
      city_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'cities', // Ensure the referenced table name matches exactly
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL', // If a city is deleted, the organization remains but the city_id is set to NULL
      },
    });

    // Add a composite unique index for name, country_id, and city_id
    await queryInterface.addIndex('organizations', ['name', 'country_id', 'city_id'], {
      unique: true,
      name: 'organizations_name_country_city_unique',
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('organizations');
  }
};
