'use strict';

const Sequelize = require('sequelize');

function createCmeTestConnection(env = process.env) {
  const required = {
    CME_TEST_DB_HOST: '127.0.0.1',
    CME_TEST_DB_PORT: '3306',
    CME_TEST_DB_NAME: 'healthmap_cme_test',
    CME_TEST_DB_USER: 'healthmap_cme_tester',
  };

  // Reject configuration before constructing any connection object. Error
  // messages name fields only; never interpolate supplied values or credentials.
  for (const [name, expected] of Object.entries(required)) {
    if (env[name] !== expected) {
      throw new Error(`Missing or invalid ${name} for isolated CME tests.`);
    }
  }
  const password = env.CME_TEST_DB_PASSWORD;
  if (typeof password !== 'string' || password.trim().length === 0) {
    throw new Error('Missing or invalid CME_TEST_DB_PASSWORD for isolated CME tests.');
  }

  // Construction is lazy: the caller must explicitly authorize any later I/O.
  return new Sequelize(env.CME_TEST_DB_NAME, env.CME_TEST_DB_USER, password, {
    host: env.CME_TEST_DB_HOST,
    port: Number(env.CME_TEST_DB_PORT),
    dialect: 'mysql',
    logging: false,
  });
}

module.exports = createCmeTestConnection;
