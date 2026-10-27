'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('users', 'wired_user_id', {
      type: Sequelize.STRING(16),
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    const [rows] = await queryInterface.sequelize.query(
      'SELECT COUNT(*) AS count FROM users WHERE wired_user_id IS NULL'
    );

    if (Number(rows[0].count) > 0) {
      throw new Error(
        'Cannot restore NOT NULL: users with missing wired_user_id exist.'
      );
    }

    await queryInterface.changeColumn('users', 'wired_user_id', {
      type: Sequelize.STRING(16),
      allowNull: false,
    });
  },
};

