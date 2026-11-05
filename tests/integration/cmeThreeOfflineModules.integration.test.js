'use strict';

jest.mock('../../services/email', () => ({ sendCme50AchievedEmail: jest.fn() }));

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const sequelize = require('../../config/connection');
const models = require('../../models');
const { createRetryFixtures, cleanupRetryFixtures } = require('./cmeRetryFixtures');

const app = express();
app.use(express.json());
app.use('/quiz-scores', require('../../controllers/api/moduleRoutes/quizScoreRoutes'));
app.use('/users', require('../../controllers/api/userRoutes/userRoutes'));
let fixture;

beforeAll(async () => {
  try { fixture = await createRetryFixtures(sequelize, models, process.env, [2, 3, 5]); } catch {
    throw new Error('Three-module CME fixture creation refused or failed; review authorization, identity, schema, and role occupancy. Driver details withheld.');
  }
});

afterAll(async () => {
  try {
    try { await cleanupRetryFixtures(sequelize, models, fixture); } catch {
      throw new Error('Three-module CME cleanup refused or failed; synthetic records may remain. No broad cleanup attempted.');
    }
  } finally {
    try { await sequelize.close(); } catch {
      throw new Error('Failed to close the isolated CME scenario connection.');
    }
  }
});

test('three offline modules and one lost-acknowledgement replay produce exactly three awards and authoritative totals', async () => {
  async function read(work) {
    try { return await work(); } catch {
      throw new Error('Three-module CME verification read failed; driver details withheld.');
    }
  }
  const year = new Date().getFullYear();
  const token = jwt.sign({ id: fixture.userId, roleId: fixture.roleId }, process.env.SECRET);
  const payloads = fixture.modules.map((module, index) => ({
    module_id: module.externalModuleId, score: [85, 90, 95][index],
    date_taken: new Date(year - 1, 11, 20 + index, 12).toISOString(),
  }));
  const submit = payload => request(app).post('/quiz-scores')
    .set('Authorization', `Bearer ${token}`).send(payload);
  const originals = [];
  async function accept(index) {
    const before = Date.now();
    const response = await submit(payloads[index]);
    expect([200, 201]).toContain(response.status);
    expect(response.body.credits_awarded).toBe(fixture.modules[index].credits);
    const awards = await read(() => models.CmeCreditAwards.findAll({
      where: { user_id: fixture.userId, module_id: fixture.modules[index].moduleId }, raw: true,
    }));
    expect(awards).toHaveLength(1);
    expect(awards[0]).toMatchObject({ year, credited_score: payloads[index].score,
      credited_date_taken: new Date(payloads[index].date_taken),
      credits_awarded: fixture.modules[index].credits });
    expect(awards[0].awarded_at.getTime()).toBeGreaterThanOrEqual(Math.floor(before / 1000) * 1000);
    expect(awards[0].awarded_at.getTime()).toBeLessThanOrEqual(Date.now());
    expect(awards[0].awarded_at.getFullYear()).toBe(year);
    originals[index] = awards[0];
  }

  await accept(0);
  await accept(1); // Independent read above verifies B committed before replay.
  expect(await read(() => models.QuizScores.count({
    where: { user_id: fixture.userId, module_id: fixture.modules[2].moduleId },
  }))).toBe(0); // C is still pending locally.
  const replay = await submit(payloads[1]);
  expect([200, 201]).toContain(replay.status);
  expect(replay.body.credits_awarded).toBe(0);
  expect(await read(() => models.CmeCreditAwards.findOne({
    where: { user_id: fixture.userId, module_id: fixture.modules[1].moduleId }, raw: true,
  }))).toEqual(originals[1]);
  await accept(2);

  const awards = await read(() => models.CmeCreditAwards.findAll({ where: { user_id: fixture.userId }, raw: true }));
  expect(awards).toHaveLength(3);
  for (const original of originals) {
    expect(awards.filter(award => award.module_id === original.module_id)).toEqual([original]);
  }
  const expectedCredits = fixture.modules.reduce((sum, module) => sum + module.credits, 0);
  expect(awards.reduce((sum, award) => sum + award.credits_awarded, 0)).toBe(expectedCredits);
  const scores = await read(() => models.QuizScores.findAll({ where: { user_id: fixture.userId } }));
  expect(scores).toHaveLength(3);
  for (const [index, module] of fixture.modules.entries()) {
    const score = scores.find(score => score.module_id === module.moduleId);
    expect(score.score).toBe(payloads[index].score);
    expect(score.date_taken.toISOString()).toBe(payloads[index].date_taken);
  }
  const user = await read(() => models.Users.findByPk(fixture.userId));
  expect(user.cme_year).toBe(year);
  expect(user.cme_credits).toBe(expectedCredits);
  const profile = await request(app).get('/users/me').set('Authorization', `Bearer ${token}`);
  expect(profile.status).toBe(200);
  expect(profile.body.id).toBe(fixture.userId);
  expect(profile.body.quizScores).toHaveLength(3);
  expect(profile.body.cmeCredits).toEqual({ status: 'available', annualRequirement: 50,
    currentYear: { year, earnedCredits: expectedCredits },
    previousYear: { year: year - 1, earnedCredits: 0 } });
  // Fail explicitly if a live run crosses New Year; never alter real DB timers.
  expect(new Date().getFullYear()).toBe(year);
}, 30000);
