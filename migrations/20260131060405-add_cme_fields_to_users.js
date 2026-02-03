'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'cme_credits', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });

    await queryInterface.addColumn('users', 'cme_year', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: new Date().getFullYear(),
    });

    await queryInterface.addColumn('users', 'cme_certificate_issued_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.addColumn('users', 'cme_reminder_sent_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('users', 'cme_reminder_sent_at');
    await queryInterface.removeColumn('users', 'cme_certificate_issued_at');
    await queryInterface.removeColumn('users', 'cme_year');
    await queryInterface.removeColumn('users', 'cme_credits');
  },
};