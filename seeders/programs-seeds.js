'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('programs', [
      {
        name: 'Basic CHW',
        training_type: 'basic',
        description: 'Basic Community Health Worker Training',
        active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        name: 'Advanced CHW Training (ACT)',
        training_type: 'act',
        description: 'Advanced Community Health Worker Training',
        active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        name: 'Specialization',
        training_type: 'specialization',
        description: 'Specialization Programs',
        active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        name: 'CME',
        training_type: 'cme',
        description: 'Continuing Medical Education',
        active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('programs', null, {});
  },
};