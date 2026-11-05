jest.mock('../config/connection', () => {
  const Sequelize = require('sequelize');
  const connection = new Sequelize('healthmap_cme_test', 'healthmap_cme_tester', 'synthetic', {
    host: '127.0.0.1', port: 3306, dialect: 'mysql', logging: false,
  });
  for (const method of ['authenticate', 'query', 'sync', 'transaction']) {
    jest.spyOn(connection, method).mockImplementation(() => { throw new Error('No real database I/O allowed'); });
  }
  return connection;
});
jest.mock('dotenv', () => { throw new Error('dotenv forbidden'); });

const models = require('../models');
const connection = require('../config/connection');
const { initializeCmeTestSchema } = require('./integration/initializeCmeTestSchema');
const pairs = [
  ['Roles', 'roles'], ['Countries', 'countries'], ['Modules', 'modules'],
  ['Cities', 'cities'], ['Organizations', 'organizations'], ['Users', 'users'],
  ['QuizScores', 'quiz_scores'], ['CmeCreditAwards', 'cme_credit_awards'],
  ['CmeCreditBalances', 'cme_credit_balances'], ['CmeCertificates', 'cme_certificates'],
];
const authorized = { CME_TEST_SCHEMA_WRITE: 'CREATE_EMPTY_SCHEMA' };
let qi;
let created;
let query;

function columnsFor(table) {
  const model = models[pairs.find(([, name]) => name === table)[0]];
  return Object.fromEntries(Object.entries(model.rawAttributes).map(([name, attr]) => [
    attr.field || name, { type: attr.type.toSql({ escape: value => `'${value}'` }), allowNull: attr.allowNull !== false,
      primaryKey: !!attr.primaryKey },
  ]));
}

beforeEach(() => {
  created = [];
  query = jest.fn().mockResolvedValueOnce([{
    database_name: 'healthmap_cme_test', account_name: 'healthmap_cme_tester@127.0.0.1',
    lower_case_table_names: 1,
  }]).mockResolvedValueOnce([]).mockResolvedValueOnce(pairs.map(([, table]) => ({
    table_name: table, table_type: 'BASE TABLE', engine: 'InnoDB',
  })));
  qi = {
    queryGenerator: connection.getQueryInterface().queryGenerator,
    describeTable: jest.fn(async table => columnsFor(table)),
    getForeignKeyReferencesForTable: jest.fn(async table => {
      const model = models[pairs.find(([, name]) => name === table)[0]];
      return Object.entries(model.rawAttributes).filter(([, attr]) => attr.references)
        .map(([name, attr]) => ({ columnName: attr.field || name,
          referencedTableSchema: 'healthmap_cme_test',
          referencedTableName: attr.references.model.toLowerCase(), referencedColumnName: attr.references.key }));
    }),
    showIndex: jest.fn(async table => {
      const model = models[pairs.find(([, name]) => name === table)[0]];
      const uniqueAttributes = Object.entries(model.rawAttributes)
        .filter(([, attr]) => attr.unique).map(([name, attr]) => ({ unique: true,
          fields: [{ attribute: attr.field || name }] }));
      return uniqueAttributes.concat(model.options.indexes.filter(index => index.unique).map(index => ({
        unique: true, fields: index.fields.map(field => ({ attribute: field })),
      })));
    }),
  };
  jest.spyOn(connection, 'query').mockImplementation(query);
  jest.spyOn(connection, 'getQueryInterface').mockReturnValue(qi);
  jest.spyOn(connection, 'sync').mockImplementation(() => { throw new Error('Global sync forbidden'); });
  for (const [name, model] of Object.entries(models)) {
    jest.spyOn(model, 'sync').mockImplementation(async options => {
      expect(options).toEqual({ engine: 'InnoDB' });
      created.push([name, model.getTableName()]);
    });
  }
});

afterEach(() => jest.restoreAllMocks());

test.each([undefined, '', 'true', '1', 'CREATE', 'false'])(
  'write flag %s refuses before reads or DDL', async flag => {
    await expect(initializeCmeTestSchema(connection, models, { CME_TEST_SCHEMA_WRITE: flag }))
      .rejects.toThrow('CME_TEST_SCHEMA_WRITE');
    expect(query).not.toHaveBeenCalled();
    expect(created).toEqual([]);
  }
);

test('creates only the ten allowed tables in dependency order and verifies real model metadata', async () => {
  const result = await initializeCmeTestSchema(connection, models, authorized);
  expect(created).toEqual(pairs);
  expect(result).toEqual({ database: 'healthmap_cme_test', createdTables: pairs.map(([, table]) => table), verified: true });
  expect(connection.sync).not.toHaveBeenCalled();
  expect(query.mock.calls[1][1].replacements).toEqual({ schema: 'healthmap_cme_test' });
  expect(query).toHaveBeenCalledTimes(3);
  expect(qi.describeTable).toHaveBeenCalledTimes(10);
  expect(qi.getForeignKeyReferencesForTable).toHaveBeenCalledTimes(10);
  expect(qi.showIndex).toHaveBeenCalledTimes(10);
});

test.each([
  { database_name: 'other', account_name: 'healthmap_cme_tester@127.0.0.1', lower_case_table_names: 1 },
  { database_name: 'healthmap_cme_test', account_name: 'root@localhost', lower_case_table_names: 1 },
  { database_name: 'healthmap_cme_test', account_name: 'healthmap_cme_tester@127.0.0.1', lower_case_table_names: 0 },
])('unexpected identity or casing refuses DDL', async identity => {
  query.mockReset().mockResolvedValueOnce([identity]);
  await expect(initializeCmeTestSchema(connection, models, authorized)).rejects.toThrow('refused');
  expect(created).toEqual([]);
  expect(query).toHaveBeenCalledTimes(1);
});

test.each(['unexpected_table', 'users'])('existing %s refuses all creation without clearing data', async table => {
  query.mockReset().mockResolvedValueOnce([{ database_name: 'healthmap_cme_test',
    account_name: 'healthmap_cme_tester@127.0.0.1', lower_case_table_names: 1 }])
    .mockResolvedValueOnce([{ table_name: table, engine: 'InnoDB' }]);
  await expect(initializeCmeTestSchema(connection, models, authorized)).rejects.toThrow('no tables or views');
  expect(created).toEqual([]);
});

test('missing associations refuse before DDL', async () => {
  const altered = { ...models, Users: Object.create(models.Users) };
  Object.defineProperty(altered.Users, 'associations', { value: {} });
  await expect(initializeCmeTestSchema(connection, altered, authorized)).rejects.toThrow('associations');
  expect(query).not.toHaveBeenCalled();
});

test('cross-schema or unexpected model table refuses before reads', async () => {
  const altered = { ...models, Users: Object.create(models.Users) };
  altered.Users.getTableName = () => 'other.users';
  await expect(initializeCmeTestSchema(connection, altered, authorized)).rejects.toThrow('allowlisted');
  expect(query).not.toHaveBeenCalled();
});

test('DDL failure leaves partial tables alone and stops immediately', async () => {
  models.Modules.sync.mockRejectedValueOnce(new Error('synthetic DDL failure'));
  await expect(initializeCmeTestSchema(connection, models, authorized)).rejects.toThrow('synthetic DDL failure');
  expect(created).toEqual(pairs.slice(0, 2));
  expect(qi.describeTable).not.toHaveBeenCalled();
});

test('rejects non-InnoDB post-creation inventory', async () => {
  query.mockReset().mockResolvedValueOnce([{ database_name: 'healthmap_cme_test',
    account_name: 'healthmap_cme_tester@127.0.0.1', lower_case_table_names: 1 }])
    .mockResolvedValueOnce([]).mockResolvedValueOnce(pairs.map(([, table]) => ({
      table_name: table, table_type: 'BASE TABLE', engine: 'MyISAM',
    })));
  await expect(initializeCmeTestSchema(connection, models, authorized)).rejects.toThrow('InnoDB');
});

test.each(['missing snapshot', 'wrong type', 'not nullable', 'missing foreign key', 'missing unique index'])(
  'post-creation verification rejects %s', async issue => {
    const describe = qi.describeTable.getMockImplementation();
    qi.describeTable.mockImplementation(async table => {
      const columns = await describe(table);
      if (table === 'cme_credit_awards') {
        if (issue === 'missing snapshot') delete columns.credited_score;
        if (issue === 'wrong type') columns.credited_score.type = 'VARCHAR(255)';
        if (issue === 'not nullable') columns.credited_date_taken.allowNull = false;
      }
      return columns;
    });
    if (issue === 'missing foreign key') qi.getForeignKeyReferencesForTable.mockResolvedValue([]);
    if (issue === 'missing unique index') qi.showIndex.mockResolvedValue([]);
    await expect(initializeCmeTestSchema(connection, models, authorized)).rejects.toThrow('refused');
    expect(created).toEqual(pairs);
  }
);
