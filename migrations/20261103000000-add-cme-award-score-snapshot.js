'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Deliberately no backfill: quiz_scores may already contain a retake.
    const table = 'cme_credit_awards';
    const existing = await queryInterface.describeTable(table);
    const columns = [
      { name: 'credited_score', type: Sequelize.FLOAT, sqlType: /^FLOAT$/,
        expected: 'nullable FLOAT' },
      { name: 'credited_date_taken', type: Sequelize.DATE,
        sqlType: /^DATETIME(?:\([0-6]\))?$/, expected: 'nullable DATETIME' },
    ];

    // Validate all existing definitions before making any schema changes.
    // Reject non-NULL defaults: legacy unknown snapshots must remain NULL.
    for (const column of columns) {
      const definition = existing[column.name];
      if (definition && (
        !column.sqlType.test(String(definition.type).trim().toUpperCase()) ||
        definition.allowNull !== true ||
        definition.defaultValue != null ||
        definition.primaryKey === true ||
        definition.autoIncrement === true
      )) {
        throw new Error(
          `Incompatible column ${table}.${column.name}: expected ${column.expected} with no non-NULL default, primary key, or auto-increment; found ${JSON.stringify(definition)}. Manual schema review is required.`
        );
      }
    }

    // MySQL DDL can commit independently; skip compatible columns on retry.
    for (const column of columns) {
      if (!existing[column.name]) {
        await queryInterface.addColumn(table, column.name, {
          type: column.type,
          allowNull: true,
        });
      }
    }
  },

  async down() {
    throw new Error(
      'This migration is intentionally irreversible to preserve credited CME history and must not be automatically rolled back. Any schema rollback requires manual review.'
    );
  },
};
