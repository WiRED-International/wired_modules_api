'use strict';

const { QueryTypes } = require('sequelize');
const schema = 'healthmap_cme_test';
const account = 'healthmap_cme_tester@127.0.0.1';
const tables = Object.freeze([
  ['Roles', 'roles'], ['Countries', 'countries'], ['Modules', 'modules'],
  ['Cities', 'cities'], ['Organizations', 'organizations'], ['Users', 'users'],
  ['QuizScores', 'quiz_scores'], ['CmeCreditAwards', 'cme_credit_awards'],
  ['CmeCreditBalances', 'cme_credit_balances'], ['CmeCertificates', 'cme_certificates'],
].map(pair => Object.freeze(pair)));
const uniqueKeys = {
  roles: [['name']], countries: [['name'], ['code']], modules: [['name']],
  cities: [['name', 'country_id']], organizations: [['name', 'country_id', 'city_id']],
  users: [['email'], ['wired_user_id']], quiz_scores: [['user_id', 'module_id']],
  cme_credit_awards: [['user_id', 'module_id', 'year']],
  cme_credit_balances: [['user_id', 'year']],
  cme_certificates: [['certificate_id'], ['user_id', 'year']],
};
const sqlTypes = {
  INTEGER: /^INT(?:EGER)?(?:\(\d+\))?$/i, FLOAT: /^FLOAT(?:\(.*\))?$/i,
  DATE: /^DATETIME(?:\([0-6]\))?$/i, DATEONLY: /^DATE$/i,
  BOOLEAN: /^TINYINT\(1\)$/i, STRING: /^VARCHAR\(\d+\)$/i,
  TEXT: /^TEXT$/i, JSON: /^JSON$/i, ENUM: /^ENUM\(/i,
};
const inventorySql = 'SELECT TABLE_NAME AS table_name, TABLE_TYPE AS table_type, ENGINE AS engine FROM information_schema.TABLES WHERE TABLE_SCHEMA = :schema ORDER BY TABLE_NAME';

function fail(message) {
  throw new Error(`CME test schema initialization refused: ${message}`);
}

async function initializeCmeTestSchema(sequelize, models, env = process.env) {
  if (env.CME_TEST_SCHEMA_WRITE !== 'CREATE_EMPTY_SCHEMA') {
    fail('CME_TEST_SCHEMA_WRITE must explicitly equal CREATE_EMPTY_SCHEMA.');
  }
  // Validate the complete model allowlist before any DDL. Import models/index
  // through the integration setup first so association-generated FKs exist.
  const allowedTables = new Set(tables.map(([, table]) => table));
  for (const [name, table] of tables) {
    const model = models[name];
    if (!model || model.sequelize !== sequelize || model.getTableName() !== table) {
      fail(`invalid allowlisted model ${name}.`);
    }
    for (const attribute of Object.values(model.rawAttributes)) {
      if (!sqlTypes[attribute.type.key]) fail(`unsupported column type in ${table}.`);
      if (attribute.references && (typeof attribute.references.model !== 'string' ||
          !allowedTables.has(attribute.references.model.toLowerCase()))) {
        fail(`foreign key outside the allowlist in ${table}.`);
      }
    }
  }
  for (const [name, alias] of [
    ['Users', 'role'], ['Users', 'organization'], ['Users', 'country'],
    ['Users', 'city'], ['Users', 'quizScores'], ['QuizScores', 'module'],
    ['CmeCertificates', 'user'], ['CmeCreditAwards', 'user'],
    ['CmeCreditAwards', 'module'], ['CmeCreditBalances', 'user'],
  ]) {
    if (!models[name].associations[alias]) fail('model associations must be initialized first.');
  }
  for (const [name, columns] of [
    ['QuizScores', ['user_id', 'module_id']],
    ['CmeCreditAwards', ['user_id', 'module_id']],
    ['CmeCreditBalances', ['user_id']], ['CmeCertificates', ['user_id']],
  ]) {
    if (columns.some(column => !models[name].rawAttributes[column]?.references)) {
      fail(`missing required foreign key metadata in ${name}.`);
    }
  }
  for (const column of ['credited_score', 'credited_date_taken']) {
    if (models.CmeCreditAwards.rawAttributes[column]?.allowNull !== true) {
      fail('nullable award snapshot metadata is required.');
    }
  }

  // Recheck the actual database and inventory immediately before first creation.
  const [identity] = await sequelize.query(
    'SELECT DATABASE() AS database_name, CURRENT_USER() AS account_name, @@lower_case_table_names AS lower_case_table_names',
    { type: QueryTypes.SELECT }
  );
  if (identity?.database_name !== schema || identity?.account_name !== account) {
    fail('unexpected database/account identity.');
  }
  // Existing Users metadata references Organizations, while the table is lowercase.
  if (Number(identity.lower_case_table_names) !== 1) {
    fail('lower_case_table_names must be 1 for the unchanged model FK casing.');
  }
  const queryOptions = { type: QueryTypes.SELECT, replacements: { schema } };
  const before = await sequelize.query(inventorySql, queryOptions);
  if (before.length !== 0) fail('database must contain no tables or views; no automatic reset is allowed.');

  // Per-model creation only. Never drop, alter, globally sync, or disable FKs.
  for (const [name] of tables) {
    await models[name].sync({ engine: 'InnoDB' });
  }

  const after = await sequelize.query(inventorySql, queryOptions);
  if (after.length !== tables.length || tables.some(([, table]) => !after.some(row =>
    row.table_name === table && row.table_type === 'BASE TABLE' && row.engine === 'InnoDB'))) {
    fail('post-creation table inventory or InnoDB engine mismatch.');
  }
  const qi = sequelize.getQueryInterface();
  for (const [name, table] of tables) {
    const columns = await qi.describeTable(table);
    for (const [attributeName, attribute] of Object.entries(models[name].rawAttributes)) {
      const column = columns[attribute.field || attributeName];
      if (!column || !sqlTypes[attribute.type.key].test(column.type) ||
          column.allowNull !== (attribute.allowNull !== false)) {
        fail(`required column definition mismatch in ${table}.`);
      }
      if (attribute.primaryKey && !column.primaryKey) fail(`missing primary key in ${table}.`);
    }
    const references = await qi.getForeignKeyReferencesForTable(table);
    for (const [attributeName, attribute] of Object.entries(models[name].rawAttributes)) {
      if (attribute.references && !references.some(fk =>
        fk.columnName === (attribute.field || attributeName) &&
        fk.referencedTableSchema === schema &&
        fk.referencedTableName.toLowerCase() === attribute.references.model.toLowerCase() &&
        fk.referencedColumnName === attribute.references.key)) {
        fail(`required foreign key missing in ${table}.`);
      }
    }
    const indexes = await qi.showIndex(table);
    for (const fields of uniqueKeys[table]) {
      if (!indexes.some(index => index.unique && index.fields.length === fields.length &&
          index.fields.every((field, i) => field.attribute === fields[i] && !field.length))) {
        fail(`required unique index missing in ${table}.`);
      }
    }
  }
  return { database: schema, createdTables: tables.map(([, table]) => table), verified: true };
}

module.exports = { initializeCmeTestSchema };
