jest.mock('sequelize', () => jest.fn());

// Fail immediately if the factory ever tries to load ordinary configuration.
jest.mock('../config/connection', () => {
  throw new Error('Runtime database configuration must not be imported');
});
jest.mock('dotenv', () => {
  throw new Error('dotenv must not be imported');
});

const Sequelize = require('sequelize');
const createCmeTestConnection = require('./integration/createCmeTestConnection');

const valid = () => ({
  CME_TEST_DB_HOST: '127.0.0.1',
  CME_TEST_DB_PORT: '3306',
  CME_TEST_DB_NAME: 'healthmap_cme_test',
  CME_TEST_DB_USER: 'healthmap_cme_tester',
  CME_TEST_DB_PASSWORD: 'synthetic-unit-test-password',
});
let connection;

beforeEach(() => {
  jest.clearAllMocks();
  connection = { authenticate: jest.fn(), sync: jest.fn(), query: jest.fn(),
    transaction: jest.fn(), getQueryInterface: jest.fn() };
  Sequelize.mockImplementation(() => connection);
});

test('valid explicit configuration constructs only the intended MySQL instance', () => {
  expect(createCmeTestConnection(valid())).toBe(connection);
  expect(Sequelize).toHaveBeenCalledTimes(1);
  expect(Sequelize).toHaveBeenCalledWith(
    'healthmap_cme_test', 'healthmap_cme_tester', 'synthetic-unit-test-password',
    { host: '127.0.0.1', port: 3306, dialect: 'mysql', logging: false }
  );
  for (const method of Object.values(connection)) expect(method).not.toHaveBeenCalled();
});

test.each(Object.keys(valid()))('missing %s fails before constructing Sequelize', name => {
  const env = valid();
  delete env[name];
  expect(() => createCmeTestConnection(env)).toThrow(name);
  expect(Sequelize).not.toHaveBeenCalled();
});

test.each([
  ['CME_TEST_DB_HOST', 'localhost'],
  ['CME_TEST_DB_HOST', '192.0.2.1'],
  ['CME_TEST_DB_HOST', '127.0.0.1.example.com'],
  ['CME_TEST_DB_PORT', '3307'],
  ['CME_TEST_DB_PORT', '3306junk'],
  ['CME_TEST_DB_NAME', 'healthmap'],
  ['CME_TEST_DB_USER', 'root'],
  ['CME_TEST_DB_PASSWORD', ''],
  ['CME_TEST_DB_PASSWORD', '   '],
  ['CME_TEST_DB_PASSWORD', null],
  ['CME_TEST_DB_PASSWORD', 123],
])('invalid %s is rejected without exposing values', (name, value) => {
  const env = { ...valid(), [name]: value };
  expect(() => createCmeTestConnection(env)).toThrow(
    `Missing or invalid ${name} for isolated CME tests.`
  );
  expect(Sequelize).not.toHaveBeenCalled();
});

test.each(Object.keys(valid()))('empty %s is rejected', name => {
  expect(() => createCmeTestConnection({ ...valid(), [name]: '' })).toThrow(name);
  expect(Sequelize).not.toHaveBeenCalled();
});

test('does not fall back to ordinary settings even with NODE_ENV=test', () => {
  expect(() => createCmeTestConnection({
    NODE_ENV: 'test',
    CLEARDB_DATABASE_URL: 'mysql://synthetic:secret@remote.invalid/other',
    DB_HOST: '127.0.0.1', DB_PORT: '3306', DB_NAME: 'healthmap_cme_test',
    DB_USER: 'healthmap_cme_tester', DB_PASS: 'synthetic-unit-test-password',
  })).toThrow('CME_TEST_DB_HOST');
  expect(Sequelize).not.toHaveBeenCalled();
});

test('ordinary settings cannot override validated test settings', () => {
  createCmeTestConnection({ ...valid(),
    CLEARDB_DATABASE_URL: 'mysql://synthetic:secret@remote.invalid/other',
    DB_HOST: 'remote.invalid', DB_NAME: 'other', DB_USER: 'other', DB_PASS: 'other',
  });
  expect(Sequelize).toHaveBeenCalledWith(
    valid().CME_TEST_DB_NAME, valid().CME_TEST_DB_USER, valid().CME_TEST_DB_PASSWORD,
    { host: '127.0.0.1', port: 3306, dialect: 'mysql', logging: false }
  );
});

test('defaults to explicit process environment without changing it', () => {
  const original = process.env;
  try {
    process.env = { ...valid() };
    createCmeTestConnection();
    expect(process.env).toEqual(valid());
    expect(Sequelize).toHaveBeenCalledTimes(1);
  } finally { process.env = original; }
});

test('validation errors and logs do not leak credentials or supplied values', () => {
  const spies = ['log', 'error', 'warn', 'info', 'debug']
    .map(method => jest.spyOn(console, method).mockImplementation(() => {}));
  const secret = 'synthetic-sensitive-value';
  try {
    let failure;
    try {
      createCmeTestConnection({ ...valid(),
        CME_TEST_DB_HOST: secret, CME_TEST_DB_PASSWORD: secret });
    } catch (error) { failure = error; }
    expect(failure).toBeInstanceOf(Error);
    expect(failure.message).not.toContain(secret);
    expect(failure.stack).not.toContain(secret);
    expect(Sequelize).not.toHaveBeenCalled();
    for (const spy of spies) expect(spy).not.toHaveBeenCalled();
  } finally { for (const spy of spies) spy.mockRestore(); }
});

test('importing the factory does not construct or open a connection', () => {
  jest.isolateModules(() => {
    const Constructor = require('sequelize');
    Constructor.mockClear();
    expect(typeof require('./integration/createCmeTestConnection')).toBe('function');
    expect(Constructor).not.toHaveBeenCalled();
  });
});
