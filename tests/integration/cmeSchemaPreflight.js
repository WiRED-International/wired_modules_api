'use strict';

const { QueryTypes } = require('sequelize');
const modelNames = [
  'Roles', 'Countries', 'Cities', 'Organizations', 'Users', 'Modules',
  'QuizScores', 'CmeCreditAwards', 'CmeCreditBalances', 'CmeCertificates',
];

function describeModels(models) {
  return modelNames.map(name => {
    const model = models[name];
    const table = model.getTableName();
    return {
      model: name,
      table: typeof table === 'string' ? table : table.tableName,
      foreignKeys: Object.entries(model.rawAttributes)
        .filter(([, attribute]) => attribute.references)
        .map(([name, attribute]) => ({
          column: attribute.field || name,
          target: attribute.references.model,
          key: attribute.references.key,
          allowNull: attribute.allowNull,
          onDelete: attribute.onDelete,
          onUpdate: attribute.onUpdate,
        })),
      associations: Object.values(model.associations).map(association => ({
        alias: association.as,
        type: association.associationType,
        target: association.target.getTableName(),
        foreignKey: association.foreignKey,
      })),
    };
  });
}

function summarizeGrants(rows) {
  // Never print raw SHOW GRANTS output: omit account/authentication clauses and
  // unrecognized statements, including role grants. Only retain privilege syntax.
  return rows.map(row => {
    const statement = Object.values(row)[0];
    const match = typeof statement === 'string' && statement.match(
      /^GRANT ([A-Z_ ,()]+) ON (\*\.\*|`healthmap_cme_test`\.\*) TO /i
    );
    if (!match) return { omitted: true, reason: 'Other scope, role, or unrecognized grant; raw text withheld.' };
    return {
      privileges: match[1],
      scope: match[2],
      grantOption: / WITH GRANT OPTION\s*$/i.test(statement),
    };
  });
}

async function runPreflight(sequelize, models) {
  // Fixed statements and explicit schema filter. No runtime configuration import,
  // schema mutations, grants changes, or table/data reads are performed.
  let identity;
  let tables;
  let grants;
  try {
    [identity] = await sequelize.query(
      'SELECT DATABASE() AS database_name, CURRENT_USER() AS account_name, @@lower_case_table_names AS lower_case_table_names',
      { type: QueryTypes.SELECT }
    );
  } catch {
    throw new Error('CME schema preflight identity query failed; driver details withheld.');
  }
  if (!identity || identity.database_name !== 'healthmap_cme_test' ||
      identity.account_name !== 'healthmap_cme_tester@127.0.0.1') {
    throw new Error('CME schema preflight rejected the database/account identity.');
  }
  try {
    tables = await sequelize.query(
      'SELECT TABLE_NAME AS table_name, TABLE_TYPE AS table_type, ENGINE AS engine FROM information_schema.TABLES WHERE TABLE_SCHEMA = :schema ORDER BY TABLE_NAME',
      { type: QueryTypes.SELECT, replacements: { schema: 'healthmap_cme_test' } }
    );
    grants = await sequelize.query('SHOW GRANTS FOR CURRENT_USER()', { type: QueryTypes.SELECT });
  } catch {
    throw new Error('CME schema preflight inventory/grants query failed; driver details withheld.');
  }
  return { identity, tables, grants: summarizeGrants(grants), models: describeModels(models) };
}

module.exports = { describeModels, summarizeGrants, runPreflight };
