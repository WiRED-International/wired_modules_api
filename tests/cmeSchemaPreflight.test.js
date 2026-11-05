// Use real Sequelize metadata without loading runtime database configuration.
jest.mock('../config/connection', () => {
  const Sequelize = require('sequelize');
  const connection = new Sequelize('synthetic', 'synthetic', 'synthetic', {
    dialect: 'mysql', logging: false,
  });
  for (const method of ['authenticate', 'query', 'sync', 'transaction']) {
    jest.spyOn(connection, method).mockImplementation(() => {
      throw new Error('Database I/O forbidden in metadata unit tests');
    });
  }
  return connection;
});
jest.mock('dotenv', () => {
  throw new Error('dotenv must not be loaded');
});

const models = require('../models');
const connection = require('../config/connection');
const { describeModels, summarizeGrants, runPreflight } = require('./integration/cmeSchemaPreflight');

test('inspects all ten real models without database I/O and confirms resolved FK casing', () => {
  const metadata = describeModels(models);
  expect(metadata).toHaveLength(10);
  const users = metadata.find(model => model.model === 'Users');
  const organizations = metadata.find(model => model.model === 'Organizations');
  expect(organizations.table).toBe('organizations');
  expect(users.foreignKeys.find(key => key.column === 'organization_id').target)
    .toBe('Organizations');
  expect(users.associations.find(association => association.alias === 'organization').target)
    .toBe('organizations');
  expect(metadata.find(model => model.model === 'CmeCertificates').foreignKeys)
    .toEqual(expect.arrayContaining([expect.objectContaining({ column: 'user_id', target: 'users' })]));
  for (const method of ['authenticate', 'query', 'sync', 'transaction']) {
    expect(connection[method]).not.toHaveBeenCalled();
  }
});

test('grant summary excludes account/authentication text and unrecognized grants', () => {
  const rows = [
    { grant: "GRANT SELECT, INSERT ON `healthmap_cme_test`.* TO `tester`@`host` IDENTIFIED BY 'synthetic-secret'" },
    { grant: 'GRANT ALL PRIVILEGES ON *.* TO `tester`@`host` WITH GRANT OPTION' },
    { grant: "GRANT `synthetic-secret` TO `tester`@`host`" },
  ];
  const summary = summarizeGrants(rows);
  expect(summary[0]).toEqual({ privileges: 'SELECT, INSERT', scope: '`healthmap_cme_test`.*', grantOption: false });
  expect(summary[1]).toEqual({ privileges: 'ALL PRIVILEGES', scope: '*.*', grantOption: true });
  expect(summary[2].omitted).toBe(true);
  expect(JSON.stringify(summary)).not.toContain('synthetic-secret');
  expect(JSON.stringify(summary)).not.toContain('tester');
});

test('preflight executes only fixed read-only statements with explicit schema and sanitized grants', async () => {
  const identity = { database_name: 'healthmap_cme_test', account_name: 'healthmap_cme_tester@127.0.0.1', lower_case_table_names: 1 };
  const tables = [{ table_name: 'users', table_type: 'BASE TABLE', engine: 'InnoDB' }];
  const query = jest.fn().mockResolvedValueOnce([identity]).mockResolvedValueOnce(tables)
    .mockResolvedValueOnce([{ grant: 'GRANT USAGE ON *.* TO `tester`@`host`' }]);
  const report = await runPreflight({ query }, models);
  expect(report.identity).toEqual(identity);
  expect(report.tables).toEqual(tables);
  expect(query).toHaveBeenCalledTimes(3);
  expect(query.mock.calls.map(([sql]) => sql)).toEqual([
    'SELECT DATABASE() AS database_name, CURRENT_USER() AS account_name, @@lower_case_table_names AS lower_case_table_names',
    'SELECT TABLE_NAME AS table_name, TABLE_TYPE AS table_type, ENGINE AS engine FROM information_schema.TABLES WHERE TABLE_SCHEMA = :schema ORDER BY TABLE_NAME',
    'SHOW GRANTS FOR CURRENT_USER()',
  ]);
  expect(query.mock.calls[1][1].replacements).toEqual({ schema: 'healthmap_cme_test' });
});

test.each([
  { database_name: 'other', account_name: 'healthmap_cme_tester@127.0.0.1' },
  { database_name: 'healthmap_cme_test', account_name: 'root@localhost' },
])('identity mismatch stops before inventory or grants', async identity => {
  const query = jest.fn().mockResolvedValueOnce([identity]);
  await expect(runPreflight({ query }, models)).rejects.toThrow('rejected the database/account identity');
  expect(query).toHaveBeenCalledTimes(1);
});

test.each([1, 2, 3])('driver error on query %s is sanitized', async failingQuery => {
  const query = jest.fn();
  if (failingQuery > 1) query.mockResolvedValueOnce([{ database_name: 'healthmap_cme_test', account_name: 'healthmap_cme_tester@127.0.0.1' }]);
  if (failingQuery > 2) query.mockResolvedValueOnce([]);
  query.mockRejectedValueOnce(new Error('synthetic-secret connection details'));
  let failure;
  try { await runPreflight({ query }, models); } catch (error) { failure = error; }
  expect(failure).toBeInstanceOf(Error);
  expect(failure.message).toContain('details withheld');
  expect(failure.stack).not.toContain('synthetic-secret');
});
