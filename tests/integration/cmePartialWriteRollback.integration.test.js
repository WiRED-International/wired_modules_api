'use strict';

// Only external email delivery is mocked; all reads, writes and transactions are real.
jest.mock('../../services/email', () => ({ sendCme50AchievedEmail: jest.fn() }));

const { randomUUID } = require('crypto');
const { QueryTypes } = require('sequelize');
const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const sequelize = require('../../config/connection');
const models = require('../../models');
const createCmeTestConnection = require('./createCmeTestConnection');
const { createRetryFixtures, cleanupRetryFixtures } = require('./cmeRetryFixtures');
const { sendCme50AchievedEmail } = require('../../services/email');

const app = express();
app.use(express.json());
app.use('/quiz-scores', require('../../controllers/api/moduleRoutes/quizScoreRoutes'));

test('a non-retryable failure after persisted CME writes rolls everything back, then a fresh submission commits once', async () => {
  let fixture;
  let observer;
  let consoleError;
  const hookName = `cme-partial-write-${randomUUID()}`;
  const attempts = [];
  const evidence = [];
  const sentinel = new Error(`Synthetic CME partial-write rollback ${hookName}`);
  let sentinelThrows = 0;
  let updateCalls = 0;
  let successTransaction;
  let emailEvidence;

  async function database(work) {
    try { return await work(); } catch {
      throw new Error('CME partial-write verification database operation failed; driver details withheld.');
    }
  }

  // Raw SELECTs on the independent instance cannot use the application's model
  // instance cache or accidentally inherit the failed transaction's connection.
  async function snapshot() {
    const select = (model, column) => observer.query(
      `SELECT * FROM ${observer.getQueryInterface().queryGenerator.quoteTable(model.getTableName())} WHERE ${column} = :userId`,
      { replacements: { userId: fixture.userId }, type: QueryTypes.SELECT }
    );
    const users = await select(models.Users, 'id');
    expect(users).toHaveLength(1);
    const user = users[0];
    return {
      user: { cme_credits: user.cme_credits, cme_year: user.cme_year,
        cme_certificate_issued_at: user.cme_certificate_issued_at,
        cme_reminder_sent_at: user.cme_reminder_sent_at },
      scores: await select(models.QuizScores, 'user_id'),
      awards: await select(models.CmeCreditAwards, 'user_id'),
      certificates: await select(models.CmeCertificates, 'user_id'),
      balances: await select(models.CmeCreditBalances, 'user_id'),
    };
  }

  try {
    fixture = await database(() => createRetryFixtures(sequelize, models, process.env, [50]));
    observer = createCmeTestConnection();
    expect(observer).not.toBe(sequelize);
    const [identity] = await database(() => observer.query(
      'SELECT DATABASE() AS database_name, CURRENT_USER() AS account_name',
      { type: QueryTypes.SELECT }
    ));
    expect(identity).toEqual({ database_name: 'healthmap_cme_test', account_name: 'healthmap_cme_tester@127.0.0.1' });
    const baseline = await database(snapshot);
    expect(baseline.user.cme_credits).toBe(0);
    expect(baseline.user.cme_certificate_issued_at).toBeNull();
    for (const key of ['scores', 'awards', 'certificates', 'balances']) expect(baseline[key]).toEqual([]);

    // Observe every transaction-scoped initial user lock, including attempts
    // that might fail before reaching afterUpdate. No database method is replaced.
    models.Users.addHook('beforeFind', hookName, options => {
      if (options.where?.id === fixture.userId && options.transaction && options.lock) {
        attempts.push(options.transaction);
      }
    });
    const completion = '2025-12-29T12:00:00.000Z';
    const pair = { user_id: fixture.userId, module_id: fixture.moduleId };
    models.Users.addHook('afterUpdate', hookName, async (user, options) => {
      if (user.id !== fixture.userId || !options.transaction || options.transaction.finished) return;
      updateCalls++;
      const transaction = options.transaction;
      // This is after the real UPDATE, before COMMIT. Read the persisted user,
      // rather than trusting the mutated in-memory instance passed to the hook.
      const writes = await database(async () => ({
        scores: await models.QuizScores.findAll({ where: pair, transaction, raw: true }),
        awards: await models.CmeCreditAwards.findAll({ where: pair, transaction, raw: true }),
        user: await models.Users.findByPk(fixture.userId, { transaction, raw: true }),
        certificates: await models.CmeCertificates.findAll({ where: { user_id: fixture.userId }, transaction, raw: true }),
      }));
      expect(transaction.finished).toBeFalsy();
      expect(writes.scores).toHaveLength(1);
      expect(writes.scores[0]).toMatchObject({ ...pair, score: 92, date_taken: new Date(completion) });
      expect(writes.awards).toHaveLength(1);
      expect(writes.awards[0]).toMatchObject({ ...pair, credits_awarded: 50,
        credited_score: 92, credited_date_taken: new Date(completion) });
      expect(writes.user.cme_credits).toBe(baseline.user.cme_credits + 50);
      expect(writes.user.cme_year).toBe(writes.awards[0].year);
      expect(writes.certificates).toHaveLength(1);
      expect(writes.certificates[0]).toMatchObject({ user_id: fixture.userId, year: writes.awards[0].year });
      expect(writes.user.cme_certificate_issued_at).toEqual(writes.certificates[0].issued_at);
      evidence.push({ transaction, writes });
      sentinelThrows++;
      throw sentinel;
    });
    const token = jwt.sign({ id: fixture.userId, roleId: fixture.roleId }, process.env.SECRET);
    const submit = () => request(app).post('/quiz-scores').set('Authorization', `Bearer ${token}`)
      .send({ module_id: fixture.externalModuleId, score: 92, date_taken: completion });
    sendCme50AchievedEmail.mockClear();
    // The expected route failure logs raw errors; retain evidence without exposing driver details.
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    const failed = await submit();
    expect(failed.status).toBe(500);
    expect(failed.body.message).toBe('Internal Server Error');
    // These assertions prevent an unrelated earlier error from satisfying the test.
    expect(updateCalls).toBe(1);
    expect(sentinelThrows).toBe(1);
    expect(evidence).toHaveLength(1);
    expect(consoleError.mock.calls.some(args => args[0] === 'Sequelize error stack:' && args[1] === sentinel.stack)).toBe(true);
    expect(sentinel.constructor).toBe(Error);
    expect(sentinel.parent).toBeUndefined();
    expect(sentinel.original).toBeUndefined();
    expect(attempts).toEqual([evidence[0].transaction]);
    expect(evidence[0].transaction.finished).toBe('rollback');
    expect(sendCme50AchievedEmail).not.toHaveBeenCalled();
    expect(await database(snapshot)).toEqual(baseline);
    consoleError.mockRestore();
    consoleError = null;

    models.Users.removeHook('afterUpdate', hookName);
    models.Users.addHook('afterUpdate', hookName, (user, options) => {
      if (user.id === fixture.userId && options.transaction && !options.transaction.finished) {
        successTransaction = options.transaction;
      }
    });
    sendCme50AchievedEmail.mockImplementation(async (user, certificate) => {
      // Capture commit state at invocation time, and independently read durable rows.
      emailEvidence = { userId: user.id, certificateId: certificate.id,
        finished: successTransaction?.finished, state: await database(snapshot) };
    });
    const accepted = await submit();
    expect([200, 201]).toContain(accepted.status);
    expect(accepted.body.credits_awarded).toBe(50);
    expect(accepted.body.passed).toBe(true);
    expect(attempts).toHaveLength(2);
    expect(attempts[1]).toBe(successTransaction);
    expect(successTransaction).not.toBe(evidence[0].transaction);
    expect(successTransaction.finished).toBe('commit');
    const committed = await database(snapshot);
    expect(committed.scores).toHaveLength(1);
    expect(committed.scores[0]).toMatchObject({ ...pair, score: 92, date_taken: new Date(completion) });
    // No year filter: this is exactly one lifetime award for the learner/module.
    expect(committed.awards).toHaveLength(1);
    expect(committed.awards[0]).toMatchObject({ ...pair, credits_awarded: 50,
      credited_score: 92, credited_date_taken: new Date(completion) });
    expect(committed.user.cme_credits).toBe(50);
    expect(committed.user.cme_year).toBe(committed.awards[0].year);
    expect(committed.certificates).toHaveLength(1);
    expect(committed.certificates[0]).toMatchObject({ user_id: fixture.userId, year: committed.awards[0].year });
    expect(committed.user.cme_certificate_issued_at).toEqual(committed.certificates[0].issued_at);
    expect(committed.balances).toEqual([]);
    expect(sendCme50AchievedEmail).toHaveBeenCalledTimes(1);
    expect(emailEvidence).toEqual({ userId: fixture.userId, certificateId: committed.certificates[0].id,
      finished: 'commit', state: committed });
    expect(sentinelThrows).toBe(1);
  } finally {
    models.Users.removeHook('afterUpdate', hookName);
    models.Users.removeHook('beforeFind', hookName);
    consoleError?.mockRestore();
    sendCme50AchievedEmail.mockReset();
    try {
      // Existing helper verifies marker ownership before deleting only our children.
      await database(() => cleanupRetryFixtures(sequelize, models, fixture));
    } finally {
      try {
        if (observer) await database(() => observer.close());
      } finally {
        await database(() => sequelize.close());
      }
    }
  }
}, 30000);
