'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('modules', 'cme_credits', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: null,
      comment: 'Number of CME credits awarded when the module is passed',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      UPDATE modules
      SET cme_credits = 5
      WHERE cme_credits IS NULL
    `);

    await queryInterface.changeColumn('modules', 'cme_credits', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 5,
      comment: 'Number of CME credits awarded when the module is passed',
    });
  },
};
