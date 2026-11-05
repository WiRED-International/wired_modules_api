'use strict';

jest.mock('../../services/email', () => ({ sendCme50AchievedEmail: jest.fn() }));

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { QueryTypes } = require('sequelize');
const sequelize = require('../../config/connection');
const models = require('../../models');
const calculateCmeCredits = require('../../services/certificates/calculateCmeCredits');
const { sendCme50AchievedEmail } = require('../../services/email');
const { createRetryFixtures, cleanupRetryFixtures } = require('./cmeRetryFixtures');
const installRecovery = require('./cmeLockTimeoutRecovery');

const app = express();
app.use(express.json());
app.use('/quiz-scores', require('../../controllers/api/moduleRoutes/quizScoreRoutes'));

test('three genuine MySQL user-lock timeouts exhaust retries without persisting CME credit, then a fresh submission succeeds', async () => {
  let fixture;
  let blocker;
  let observer;
  let pending;
  let consoleError;
  async function database(work) {
    try { return await work(); } catch {
      throw new Error('Isolated CME timeout scenario database operation failed; driver details withheld.');
    }
  }
  try {
    // The endpoint must acquire a connection while the blocker still owns one.
    expect(sequelize.connectionManager.pool.maxSize).toBeGreaterThanOrEqual(2);
    fixture = await database(() => createRetryFixtures(sequelize, models));
    blocker = await database(() => sequelize.transaction());
    const [identity] = await database(() => sequelize.query(
      'SELECT DATABASE() AS database_name, CURRENT_USER() AS account_name',
      { transaction: blocker, type: QueryTypes.SELECT }
    ));
    expect(identity).toEqual({ database_name: 'healthmap_cme_test', account_name: 'healthmap_cme_tester@127.0.0.1' });
    const lockedUser = await database(() => models.Users.findOne({
      where: { id: fixture.userId, email: `${fixture.marker}@example.invalid` },
      transaction: blocker, lock: blocker.LOCK.UPDATE,
    }));
    expect(lockedUser).toBeTruthy();
    observer = installRecovery(sequelize, models.Users, fixture.userId, blocker, { holdUntilExhausted: true });
    const token = jwt.sign({ id: fixture.userId, roleId: fixture.roleId }, process.env.SECRET);
    const completion = '2025-12-29T12:00:00.000Z';
    // No client timeout: cleanup must not race a still-running server request.
    // Suppress the route's expected raw driver logging; assertions retain sanitized evidence.
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    pending = request(app).post('/quiz-scores').set('Authorization', `Bearer ${token}`)
      .send({ module_id: fixture.externalModuleId, score: 92, date_taken: completion }).then(response => response);
    const exhausted = await pending;
    consoleError.mockRestore();
    consoleError = null;
    expect(exhausted.status).toBe(500);
    expect(exhausted.body.message).toBe('Internal Server Error');
    // A completed response while the blocker is still active proves the route
    // stopped itself. The observer never caps attempts or injects failures.
    expect(blocker.finished).toBeFalsy();
    expect(observer.attempts).toHaveLength(3);
    expect(new Set(observer.attempts.map(attempt => attempt.transaction.id)).size).toBe(3);
    for (const attempt of observer.attempts) {
      expect(attempt.error).toEqual({ code: 'ER_LOCK_WAIT_TIMEOUT', errno: 1205,
        sqlState: 'HY000', userLockSql: true });
      expect(attempt.transaction.finished).toBe('rollback');
      expect(attempt.timeoutConfigured).toBe(true);
      expect(attempt.connection).not.toBe(blocker.connection);
    }
    expect(await database(() => models.QuizScores.count({ where: { user_id: fixture.userId } }))).toBe(0);
    expect(await database(() => models.CmeCreditAwards.count({ where: { user_id: fixture.userId } }))).toBe(0);
    const unchangedUser = await database(() => models.Users.findByPk(fixture.userId));
    expect(unchangedUser.cme_credits).toBe(0);
    expect(await database(() => models.CmeCreditBalances.count({ where: { user_id: fixture.userId } }))).toBe(0);
    expect(await database(() => models.CmeCertificates.count({ where: { user_id: fixture.userId } }))).toBe(0);
    expect(sendCme50AchievedEmail).not.toHaveBeenCalled();
    await database(() => blocker.rollback());
    expect(blocker.finished).toBe('rollback');
    observer.dispose();
    observer = null;

    // Normal request after releasing the lock; pool connections may now be reused.
    pending = request(app).post('/quiz-scores').set('Authorization', `Bearer ${token}`)
      .send({ module_id: fixture.externalModuleId, score: 92, date_taken: completion }).then(response => response);
    const response = await pending;
    expect([200, 201]).toContain(response.status);
    expect(response.body.credits_awarded).toBe(2);

    const pair = { user_id: fixture.userId, module_id: fixture.moduleId };
    const awards = await database(() => models.CmeCreditAwards.findAll({ where: { user_id: fixture.userId }, raw: true }));
    expect(awards).toHaveLength(1);
    expect(awards[0]).toMatchObject({ ...pair, credited_score: 92,
      credited_date_taken: new Date(completion), credits_awarded: 2 });
    expect(awards[0].year).toBe(awards[0].awarded_at.getFullYear());
    const scores = await database(() => models.QuizScores.findAll({ where: { user_id: fixture.userId } }));
    expect(scores).toHaveLength(1);
    expect(scores[0].module_id).toBe(fixture.moduleId);
    expect(scores[0].score).toBe(92);
    expect(scores[0].date_taken.toISOString()).toBe(completion);
    const user = await database(() => models.Users.findByPk(fixture.userId));
    expect(user.cme_credits).toBe(2);
    expect(user.cme_year).toBe(awards[0].year);
    expect((await database(() => calculateCmeCredits(fixture.userId, awards[0].year))).credits).toBe(2);
    expect(await database(() => models.CmeCreditBalances.count({ where: { user_id: fixture.userId } }))).toBe(0);
    expect(await database(() => models.CmeCertificates.count({ where: { user_id: fixture.userId } }))).toBe(0);
    expect(sendCme50AchievedEmail).not.toHaveBeenCalled();
    // This fails at the initial user lock, before score/award writes. It does not
    // establish rollback integrity after partial writes.
  } finally {
    // Release before awaiting outstanding requests, even when assertions fail.
    try {
      try {
        if (blocker && !blocker.finished) await database(() => blocker.rollback());
      } finally {
        if (pending) await Promise.allSettled([pending]);
      }
    } finally {
      consoleError?.mockRestore();
      observer?.dispose();
      try {
        await database(() => cleanupRetryFixtures(sequelize, models, fixture));
      } finally {
        // SESSION timeout changes cannot leak beyond this file's injected pool.
        await database(() => sequelize.close());
      }
    }
  }
}, 60000);
