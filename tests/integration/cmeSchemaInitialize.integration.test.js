'use strict';

const sequelize = require('../../config/connection');
const models = require('../../models');
const { initializeCmeTestSchema } = require('./initializeCmeTestSchema');

afterAll(async () => {
  try { await sequelize.close(); } catch {
    throw new Error('Failed to close the isolated CME schema connection.');
  }
});

test('creates and verifies only the explicitly authorized empty CME test schema', async () => {
  let result;
  try {
    result = await initializeCmeTestSchema(sequelize, models);
  } catch {
    // Never expose connection credentials or raw driver errors in Jest output.
    throw new Error('CME schema initialization failed or was refused. Partial tables may remain; no automatic cleanup was attempted. Review authorization, identity, empty inventory, and schema metadata.');
  }
  expect(result.verified).toBe(true);
  console.log(JSON.stringify(result));
}, 60000);
