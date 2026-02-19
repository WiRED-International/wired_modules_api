'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      INSERT IGNORE INTO organization_countries (organization_id, country_id, createdAt, updatedAt)
      SELECT id, country_id, NOW(), NOW()
      FROM organizations
      WHERE country_id IS NOT NULL
    `);
  },

  async down() {
    // no-op (data migration)
  },
};
