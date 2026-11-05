'use strict';

// Stub external notification delivery only. Models, hooks, locks, award and
// certificate services, and all MySQL transactions remain real.
jest.mock('../../services/email', () => ({ sendCme50AchievedEmail: jest.fn() }));

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const sequelize = require('../../config/connection');
const models = require('../../models');
const calculateCmeCredits = require('../../services/certificates/calculateCmeCredits');
const { createRetryFixtures, cleanupRetryFixtures } = require('./cmeRetryFixtures');

const app = express();
app.use(express.json());
app.use('/quiz-scores', require('../../controllers/api/moduleRoutes/quizScoreRoutes'));
let fixture;

beforeAll(async () => {
  try { fixture = await createRetryFixtures(sequelize, models); } catch {
    throw new Error('CME synthetic fixture creation was refused or failed; review authorization, identity, schema, and learner role occupancy. Driver details withheld.');
  }
});

afterAll(async () => {
  try {
    try { await cleanupRetryFixtures(sequelize, models, fixture); } catch {
      throw new Error('CME fixture cleanup was refused or failed; synthetic records may remain. No broad cleanup was attempted.');
    }
  } finally {
    try { await sequelize.close(); } catch {
      throw new Error('Failed to close the isolated CME scenario connection.');
    }
  }
});

test('lost-acknowledgement retry and retake preserve one lifetime credited result', async () => {
  // Do not expose raw ORM errors or connection configuration on direct reads.
  async function read(work) {
    try { return await work(); } catch {
      throw new Error('CME scenario database read failed; driver details withheld.');
    }
  }
  const token = jwt.sign({ id: fixture.userId, roleId: fixture.roleId }, process.env.SECRET);
  const completion = '2025-12-29T12:00:00.000Z';
  const payload = { module_id: fixture.externalModuleId, score: 90, date_taken: completion };
  const submit = body => request(app).post('/quiz-scores')
    .set('Authorization', `Bearer ${token}`).send(body);
  const pair = { user_id: fixture.userId, module_id: fixture.moduleId };
  const user = await read(() => models.Users.findByPk(fixture.userId));
  expect(bcrypt.getRounds(user.password)).toBe(10);

  const before = Date.now();
  const first = await submit(payload);
  expect([200, 201]).toContain(first.status);
  expect(first.body.credits_awarded).toBe(2);
  const original = await read(() => models.CmeCreditAwards.findOne({ where: pair, raw: true }));
  expect(original).toBeTruthy();
  expect(original.credited_score).toBe(90);
  expect(original.credited_date_taken.toISOString()).toBe(completion);
  expect(original.awarded_at.getTime()).toBeGreaterThanOrEqual(Math.floor(before / 1000) * 1000);
  expect(original.awarded_at.getTime()).toBeLessThanOrEqual(Date.now());
  expect(original.year).toBe(original.awarded_at.getFullYear());

  // Treat the first acknowledgement as lost: replay the exact persisted payload.
  // This deterministically models the client replay, not a real socket failure.
  const retry = await submit(payload);
  expect([200, 201]).toContain(retry.status);
  expect(retry.body.credits_awarded).toBe(0);
  expect(retry.body.quizScore.score).toBe(90);
  expect(await read(() => models.QuizScores.count({ where: pair }))).toBe(1);
  const saved = await read(() => models.QuizScores.findOne({ where: pair }));
  expect(saved.score).toBe(90);
  expect(saved.date_taken.toISOString()).toBe(completion);

  const retakeDate = '2026-01-03T12:00:00.000Z';
  const retake = await submit({ ...payload, score: 45, date_taken: retakeDate });
  expect([200, 201]).toContain(retake.status);
  expect(retake.body.credits_awarded).toBe(0);
  expect(retake.body.passed).toBe(false);
  const latest = await read(() => models.QuizScores.findOne({ where: pair }));
  expect(latest.score).toBe(45);
  expect(latest.date_taken.toISOString()).toBe(retakeDate);
  expect(await read(() => models.QuizScores.count({ where: pair }))).toBe(1);
  const awards = await read(() => models.CmeCreditAwards.findAll({ where: pair, raw: true }));
  expect(awards).toEqual([original]);
  const creditedUser = await read(() => models.Users.findByPk(fixture.userId));
  expect(creditedUser.cme_credits).toBe(2);
  expect(creditedUser.cme_year).toBe(original.year);
  expect((await read(() => calculateCmeCredits(fixture.userId, original.year))).credits).toBe(2);
  expect(await read(() => models.CmeCertificates.count({ where: { user_id: fixture.userId } }))).toBe(0);
}, 30000);
