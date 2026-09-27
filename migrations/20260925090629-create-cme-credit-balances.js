'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('cme_credit_balances', {
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

      opening_credits: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'CME credits earned before the CME award ledger became active',
      },

      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },

      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    });

    await queryInterface.addIndex(
      'cme_credit_balances',
      ['user_id', 'year'],
      {
        unique: true,
        name: 'cme_credit_balances_user_year_unique',
      }
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('cme_credit_balances');
  },
};
