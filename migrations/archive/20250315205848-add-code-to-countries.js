'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('countries', 'code', {
      type: Sequelize.DataTypes.STRING,
      allowNull: true,
      unique: true,
    });
    // Step 2: Populate the 'code' column with default values (ISO country codes)
    await queryInterface.sequelize.query(`
      UPDATE countries 
      SET code = 
        CASE 
          WHEN name = 'Armenia' THEN 'AM'
          WHEN name = 'Kenya' THEN 'KE'
          WHEN name = 'Liberia' THEN 'LR'
          WHEN name = 'Nigeria' THEN 'NG'
          WHEN name = 'United States' THEN 'US'
          ELSE CONCAT('C', id) -- Fallback unique value
        END
      WHERE code IS NULL;
    `);

    // Step 3: Change 'code' column to NOT NULL
    await queryInterface.changeColumn('countries', 'code', {
      type: Sequelize.DataTypes.STRING,
      allowNull: false,
      unique: true,
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('countries', 'code');
  }
};
