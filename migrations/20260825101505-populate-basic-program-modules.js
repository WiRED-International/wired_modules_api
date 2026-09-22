'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const [programs] = await queryInterface.sequelize.query(`
      SELECT id
      FROM programs
      WHERE training_type = 'basic'
      LIMIT 1
    `);

    if (programs.length === 0) {
      throw new Error('Basic CHW program not found.');
    }

    const programId = programs[0].id;

    const [modules] = await queryInterface.sequelize.query(`
      SELECT id
      FROM modules
      WHERE JSON_CONTAINS(categories, '"basic"')
    `);

    if (modules.length === 0) {
      console.log('No Basic CHW modules found. Nothing to populate.');
      return;
    }

    const rows = modules.map((module) => {
      return {
        program_id: programId,
        module_id: module.id,
        created_at: new Date(),
        updated_at: new Date(),
      };
    });

    await queryInterface.bulkInsert('program_modules', rows);
  },

  async down(queryInterface, Sequelize) {
    const [programs] = await queryInterface.sequelize.query(`
      SELECT id
      FROM programs
      WHERE training_type = 'basic'
      LIMIT 1
    `);

    if (programs.length === 0) {
      return;
    }

    await queryInterface.bulkDelete(
      'program_modules',
      {
        program_id: programs[0].id,
      }
    );
  },
};
