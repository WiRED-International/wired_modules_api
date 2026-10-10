'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(
      'modules',
      'content_updated_at',
      {
        type: Sequelize.DATEONLY,
        allowNull: true,
        defaultValue: null,
        comment: 'Date the educational content was last revised',
      }
    );

    await queryInterface.addColumn(
      'modules',
      'package_uploaded_at',
      {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: null,
        comment: 'Date the current module ZIP was published',
      }
    );
  },

  async down(queryInterface) {
    await queryInterface.removeColumn(
      'modules',
      'package_uploaded_at'
    );

    await queryInterface.removeColumn(
      'modules',
      'content_updated_at'
    );
  },
};
