const Sequelize = require('sequelize');
const migration = require('../migrations/20261103000000-add-cme-award-score-snapshot');

const score = { type: 'FLOAT', allowNull: true, defaultValue: null, primaryKey: false };
const date = { type: 'DATETIME', allowNull: true, defaultValue: null, primaryKey: false };

function queryInterface(schema) {
  return {
    describeTable: jest.fn().mockImplementation(async () => structuredClone(schema)),
    addColumn: jest.fn().mockImplementation(async (_, name, definition) => {
      schema[name] = { ...definition, type: name === 'credited_score' ? 'FLOAT' : 'DATETIME' };
    }),
  };
}

test.each([
  ['neither column', {}, ['credited_score', 'credited_date_taken']],
  ['score only', { credited_score: score }, ['credited_date_taken']],
  ['date only', { credited_date_taken: date }, ['credited_score']],
  ['both columns', { credited_score: score, credited_date_taken: date }, []],
])('adds only missing columns when schema contains %s', async (_, initial, missing) => {
  const schema = structuredClone(initial);
  const qi = queryInterface(schema);
  await migration.up(qi, Sequelize);
  expect(qi.describeTable).toHaveBeenCalledWith('cme_credit_awards');
  expect(qi.addColumn.mock.calls).toEqual(missing.map(name => [
    'cme_credit_awards', name,
    { type: name === 'credited_score' ? Sequelize.FLOAT : Sequelize.DATE, allowNull: true },
  ]));
  for (const name of Object.keys(initial)) expect(schema[name]).toEqual(initial[name]);
});

test.each([
  ['credited_score', { ...score, type: 'INTEGER' }],
  ['credited_score', { ...score, type: 'FLOAT(10,2)' }],
  ['credited_score', { ...score, allowNull: false }],
  ['credited_score', { ...score, defaultValue: 0 }],
  ['credited_score', { ...score, primaryKey: true }],
  ['credited_score', { ...score, autoIncrement: true }],
  ['credited_date_taken', { ...date, type: 'DATE' }],
  ['credited_date_taken', { ...date, type: 'TIMESTAMP' }],
  ['credited_date_taken', { ...date, type: 'DATETIME(7)' }],
  ['credited_date_taken', { ...date, allowNull: false }],
  ['credited_date_taken', { ...date, defaultValue: 'CURRENT_TIMESTAMP' }],
])('rejects incompatible %s definition %j before any DDL', async (name, definition) => {
  const qi = queryInterface({ [name]: definition });
  await expect(migration.up(qi, Sequelize)).rejects.toThrow(
    `Incompatible column cme_credit_awards.${name}: expected nullable`
  );
  expect(qi.addColumn).not.toHaveBeenCalled();
});

test('accepts normalized types and compatible DATETIME precision', async () => {
  const qi = queryInterface({
    credited_score: { ...score, type: ' float ' },
    credited_date_taken: { ...date, type: 'datetime(6)' },
  });
  await migration.up(qi, Sequelize);
  expect(qi.addColumn).not.toHaveBeenCalled();
});

test('retries safely after the second addColumn fails', async () => {
  const schema = {};
  const qi = queryInterface(schema);
  const addColumn = qi.addColumn.getMockImplementation();
  qi.addColumn.mockImplementationOnce(addColumn)
    .mockRejectedValueOnce(new Error('second ALTER failed'));
  await expect(migration.up(qi, Sequelize)).rejects.toThrow('second ALTER failed');
  expect(Object.keys(schema)).toEqual(['credited_score']);
  qi.addColumn.mockClear();
  await migration.up(qi, Sequelize);
  expect(qi.addColumn).toHaveBeenCalledTimes(1);
  expect(qi.addColumn.mock.calls[0][1]).toBe('credited_date_taken');
  qi.addColumn.mockClear();
  await migration.up(qi, Sequelize);
  expect(qi.addColumn).not.toHaveBeenCalled();
});

test('propagates schema inspection failures without DDL', async () => {
  const qi = queryInterface({});
  qi.describeTable.mockRejectedValueOnce(new Error('schema unavailable'));
  await expect(migration.up(qi, Sequelize)).rejects.toThrow('schema unavailable');
  expect(qi.addColumn).not.toHaveBeenCalled();
});

test('down remains intentionally irreversible and performs no schema writes', async () => {
  const qi = queryInterface({});
  await expect(migration.down(qi, Sequelize)).rejects.toThrow('intentionally irreversible');
  expect(qi.describeTable).not.toHaveBeenCalled();
  expect(qi.addColumn).not.toHaveBeenCalled();
});
