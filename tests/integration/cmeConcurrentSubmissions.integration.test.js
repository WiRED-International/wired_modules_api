'use strict';

jest.mock('../../services/email', () => ({ sendCme50AchievedEmail: jest.fn() }));

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const sequelize = require('../../config/connection');
const models = require('../../models');
const { createRetryFixtures, cleanupRetryFixtures } = require('./cmeRetryFixtures');
const installOverlap = require('./cmeTransactionOverlap');

const app = express();
app.use(express.json());
app.use('/quiz-scores', require('../../controllers/api/moduleRoutes/quizScoreRoutes'));
app.use('/users', require('../../controllers/api/userRoutes/userRoutes'));

afterAll(async () => {
  try { await sequelize.close(); } catch {
    throw new Error('Failed to close isolated CME concurrency connection.');
  }
});

async function read(work) {
  try { return await work(); } catch {
    throw new Error('CME concurrency verification read failed; driver details withheld.');
  }
}

async function withFixtures(credits, work) {
  let fixture;
  try { fixture = await createRetryFixtures(sequelize, models, process.env, credits); } catch {
    throw new Error('CME concurrency fixtures refused or failed; review authorization, identity, schema, and role occupancy. Driver details withheld.');
  }
  try { await work(fixture); } finally {
    try { await cleanupRetryFixtures(sequelize, models, fixture); } catch {
      throw new Error('CME concurrency cleanup refused or failed; synthetic records may remain.');
    }
  }
}

function client(fixture) {
  const token = jwt.sign({ id: fixture.userId, roleId: fixture.roleId }, process.env.SECRET);
  return {
    submit: payload => request(app).post('/quiz-scores')
      .set('Authorization', `Bearer ${token}`).send(payload).timeout({ deadline: 20000 }),
    profile: () => request(app).get('/users/me').set('Authorization', `Bearer ${token}`),
  };
}

async function submitTogether(fixture, api, payloads) {
  // This hook runs after each real transaction has begun and obtained its own
  // pooled connection, before the real user SELECT FOR UPDATE. Neither request
  // may proceed until both transactions are active. No query or lock is mocked.
  const overlap = installOverlap(models.Users, fixture.userId);
  let outcomes;
  try {
    outcomes = await Promise.allSettled(payloads.map(payload => api.submit(payload)));
    overlap.verify();
  } finally { overlap.dispose(); }
  // Current endpoint documents successful saving of duplicate submissions.
  // It has no intentional conflict rejection for these valid fixture requests.
  // Unexpected 4xx, exhausted-retry 500, or transport failures fail this test.
  expect(outcomes.map(outcome => outcome.status)).toEqual(['fulfilled', 'fulfilled']);
  const responses = outcomes.map(outcome => outcome.value);
  for (const response of responses) {
    expect([200, 201]).toContain(response.status);
    expect(response.body.passed).toBe(true);
    expect(response.body.credit_type).toBe('cme');
    expect(response.body.quizScore.user_id).toBe(fixture.userId);
  }
  return responses;
}

async function assertTotals(fixture, api, year, expected) {
  const profile = await api.profile();
  expect(profile.status).toBe(200);
  expect(profile.body.cmeCredits).toEqual({ status: 'available', annualRequirement: 50,
    currentYear: { year, earnedCredits: expected }, previousYear: { year: year - 1, earnedCredits: 0 } });
  const user = await read(() => models.Users.findByPk(fixture.userId));
  expect(user.cme_year).toBe(year);
  expect(user.cme_credits).toBe(expected);
  expect(new Date().getFullYear()).toBe(year);
}

test('SCENARIO 1: overlapping same-module requests create one immutable lifetime award', async () => {
  await withFixtures([2], async fixture => {
    const api = client(fixture);
    const year = new Date().getFullYear();
    const payloads = [85, 95].map((score, index) => ({
      module_id: fixture.externalModuleId, score,
      date_taken: new Date(year - 1, 11, 20 + index, 12).toISOString(),
    }));
    const responses = await submitTogether(fixture, api, payloads);
    expect(responses.map(response => response.body.credits_awarded).sort()).toEqual([0, 2]);
    const winner = responses.findIndex(response => response.body.credits_awarded === 2);
    const pair = { user_id: fixture.userId, module_id: fixture.moduleId };
    const awards = await read(() => models.CmeCreditAwards.findAll({ where: { user_id: fixture.userId }, raw: true }));
    expect(awards).toHaveLength(1);
    expect(awards[0]).toMatchObject({ ...pair, year, credits_awarded: 2,
      credited_score: payloads[winner].score, credited_date_taken: new Date(payloads[winner].date_taken) });
    expect(awards[0].awarded_at.getFullYear()).toBe(year);
    const scores = await read(() => models.QuizScores.findAll({ where: pair }));
    expect(scores).toHaveLength(1);
    expect(payloads.some(payload => payload.score === scores[0].score &&
      payload.date_taken === scores[0].date_taken.toISOString())).toBe(true);
    // Replay the non-winning payload after both settle. Mutable scores may
    // change, but the winning credited snapshot must not.
    const replay = await api.submit(payloads[1 - winner]);
    expect([200, 201]).toContain(replay.status);
    expect(replay.body.credits_awarded).toBe(0);
    expect(await read(() => models.CmeCreditAwards.findAll({ where: pair, raw: true }))).toEqual(awards);
    await assertTotals(fixture, api, year, 2);
  });
}, 60000);

test('SCENARIO 2: overlapping different-module requests retain both awards and summed totals', async () => {
  await withFixtures([2, 3], async fixture => {
    const api = client(fixture);
    const year = new Date().getFullYear();
    const payloads = fixture.modules.map((module, index) => ({
      module_id: module.externalModuleId, score: [88, 96][index],
      date_taken: new Date(year - 1, 11, 20 + index, 12).toISOString(),
    }));
    const responses = await submitTogether(fixture, api, payloads);
    expect(responses.map(response => response.body.credits_awarded)).toEqual([2, 3]);
    const awards = await read(() => models.CmeCreditAwards.findAll({ where: { user_id: fixture.userId }, raw: true }));
    expect(awards).toHaveLength(2);
    for (const [index, module] of fixture.modules.entries()) {
      const matches = awards.filter(award => award.module_id === module.moduleId);
      expect(matches).toHaveLength(1);
      expect(matches[0]).toMatchObject({ year, credits_awarded: module.credits,
        credited_score: payloads[index].score, credited_date_taken: new Date(payloads[index].date_taken) });
      expect(matches[0].awarded_at.getFullYear()).toBe(year);
    }
    expect(awards.reduce((sum, award) => sum + award.credits_awarded, 0)).toBe(5);
    expect(await read(() => models.QuizScores.count({ where: { user_id: fixture.userId } }))).toBe(2);
    await assertTotals(fixture, api, year, 5);
  });
}, 60000);
