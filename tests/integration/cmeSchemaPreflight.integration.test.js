'use strict';

const sequelize = require('../../config/connection');
const models = require('../../models');
const { runPreflight } = require('./cmeSchemaPreflight');

afterAll(async () => {
  try {
    await sequelize.close();
  } catch {
    throw new Error('Failed to close the isolated CME preflight connection.');
  }
});

test('reports isolated CME schema readiness without changing the database', async () => {
  const report = await runPreflight(sequelize, models);
  console.log(JSON.stringify(report, null, 2));
  expect(report.models).toHaveLength(10);
}, 15000);
