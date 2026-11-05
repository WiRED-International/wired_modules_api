const path = require('path');
const root = path.resolve(__dirname, '..');
const connectionPath = require.resolve('../config/connection');
let originalEnv;
let constructor;
let connection;

beforeEach(() => {
  jest.resetModules();
  jest.dontMock('../config/connection');
  originalEnv = process.env;
  // Synthetic credentials only; never read the developer's database password.
  process.env = {
    NODE_ENV: 'test', SECRET: 'synthetic-jwt-secret',
    CME_TEST_DB_HOST: '127.0.0.1', CME_TEST_DB_PORT: '3306',
    CME_TEST_DB_NAME: 'healthmap_cme_test', CME_TEST_DB_USER: 'healthmap_cme_tester',
    CME_TEST_DB_PASSWORD: 'synthetic-setup-password',
    CLEARDB_DATABASE_URL: 'mysql://synthetic:secret@remote.invalid/other',
    DB_NAME: 'other', DB_HOST: 'remote.invalid', DB_USER: 'other', DB_PASS: 'other',
  };
  // Keep actual model definitions/associations usable, while mocking construction
  // and trapping every database operation. Sequelize construction alone is lazy.
  const actual = jest.requireActual('sequelize');
  constructor = jest.fn((...args) => {
    connection = new actual.Sequelize(...args);
    for (const method of ['authenticate', 'sync', 'query', 'transaction']) {
      jest.spyOn(connection, method).mockImplementation(() => {
        throw new Error('Database I/O is forbidden in setup unit tests');
      });
    }
    // Model registration uses this metadata accessor without executing SQL.
    jest.spyOn(connection, 'getQueryInterface');
    return connection;
  });
  jest.doMock('sequelize', () => Object.assign(constructor, actual));
  jest.doMock('dotenv', () => {
    throw new Error('dotenv must not be imported by integration setup');
  });
});

afterEach(() => {
  process.env = originalEnv;
  jest.restoreAllMocks();
  jest.dontMock('../config/connection');
  jest.dontMock('sequelize');
  jest.dontMock('dotenv');
  jest.resetModules();
});

test('dedicated configuration registers injection first and selects only integration scenarios', () => {
  const config = require('../jest.cme-integration.config');
  expect(config.rootDir).toBe(root);
  expect(config.setupFiles[0]).toBe('<rootDir>/tests/integration/jest.setup.js');
  expect(config.testMatch).toEqual(['<rootDir>/tests/integration/**/*.integration.test.js']);
  expect(config.resetModules).toBe(false);
  expect(config.maxWorkers).toBe(1);
});

test('setup constructs once, imports no application code, and invokes no database methods', () => {
  require('./integration/jest.setup');
  expect(constructor).toHaveBeenCalledTimes(1);
  expect(constructor).toHaveBeenCalledWith(
    'healthmap_cme_test', 'healthmap_cme_tester', 'synthetic-setup-password',
    { host: '127.0.0.1', port: 3306, dialect: 'mysql', logging: false }
  );
  expect(require.cache[require.resolve('../models')]).toBeUndefined();
  for (const method of ['authenticate', 'sync', 'query', 'transaction', 'getQueryInterface']) {
    expect(connection[method]).not.toHaveBeenCalled();
  }
});

test('real models, associations, routes and services share the injected connection', () => {
  require('./integration/jest.setup');
  expect(require('../config/connection')).toBe(connection);
  expect(require(connectionPath)).toBe(connection);
  expect(require('../models/../config/connection')).toBe(connection);
  const models = require('../models');
  for (const model of Object.values(models)) expect(model.sequelize).toBe(connection);
  expect(models.Users.associations.quizScores.target).toBe(models.QuizScores);
  expect(typeof require('../services/certificates/calculateCmeCredits')).toBe('function');
  expect(typeof require('../services/certificates/issueCmeCertificate')).toBe('function');
  // Replace outbound email only, retaining the real routes and database logic.
  jest.doMock('../services/email', () => ({ sendCme50AchievedEmail: jest.fn() }));
  expect(typeof require('../controllers/api/moduleRoutes/quizScoreRoutes')).toBe('function');
  expect(typeof require('../controllers/api/userRoutes/userRoutes')).toBe('function');
  expect(require('../config/connection')).toBe(connection);
  expect(constructor).toHaveBeenCalledTimes(1);
  for (const method of ['authenticate', 'sync', 'query', 'transaction']) {
    expect(connection[method]).not.toHaveBeenCalled();
  }
});

test.each([
  ['CME_TEST_DB_HOST', undefined], ['CME_TEST_DB_HOST', 'remote.invalid'],
  ['CME_TEST_DB_PORT', undefined], ['CME_TEST_DB_PORT', '3307'],
  ['CME_TEST_DB_NAME', undefined], ['CME_TEST_DB_NAME', 'other'],
  ['CME_TEST_DB_USER', undefined], ['CME_TEST_DB_USER', 'root'],
  ['CME_TEST_DB_PASSWORD', undefined], ['CME_TEST_DB_PASSWORD', ''],
])('setup rejects missing/invalid %s before construction, despite fallback credentials', (key, value) => {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
  expect(() => require('./integration/jest.setup')).toThrow(key);
  expect(constructor).not.toHaveBeenCalled();
});

test('late setup refuses already-imported application models', () => {
  jest.doMock('../config/connection', () => constructor(
    'synthetic', 'synthetic', 'synthetic', { dialect: 'mysql', logging: false }
  ));
  require('../models');
  expect(constructor).toHaveBeenCalledTimes(1);
  expect(() => require('./integration/jest.setup')).toThrow('before application imports');
  expect(constructor).toHaveBeenCalledTimes(1);
});

test('ordinary Jest setup requires no database credentials or integration setup', () => {
  for (const key of Object.keys(process.env)) {
    if (key.startsWith('CME_TEST_DB_')) delete process.env[key];
  }
  const config = require('../package.json').jest;
  expect(config.setupFiles).toEqual(['<rootDir>/tests/jest.setup.js']);
  expect(config.testPathIgnorePatterns).toContain('<rootDir>/tests/integration/');
  require('./jest.setup');
  expect(process.env.SECRET).toBe('test-secret');
  expect(constructor).not.toHaveBeenCalled();
});
