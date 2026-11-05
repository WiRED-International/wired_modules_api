'use strict';

// The dedicated Jest setup injects the validated test connection before import.
const sequelize = require('../../config/connection');
const { QueryTypes } = require('sequelize');

afterAll(async () => {
  try {
    await sequelize.close();
  } catch {
    throw new Error('Failed to close the isolated CME test connection.');
  }
});

test('connects only to the isolated CME database using the restricted account', async () => {
  // Sanitize driver failures so Jest does not print connection configuration.
  let rows;
  try {
    await sequelize.authenticate();
    rows = await sequelize.query(
      'SELECT DATABASE() AS database_name, CURRENT_USER() AS account_name',
      { type: QueryTypes.SELECT }
    );
  } catch {
    throw new Error('Isolated CME connectivity check failed; verify the private test configuration and local MySQL availability.');
  }

  expect(rows).toHaveLength(1);
  expect(rows[0].database_name).toBe('healthmap_cme_test');
  expect(rows[0].account_name).toBe('healthmap_cme_tester@127.0.0.1');
}, 15000);
