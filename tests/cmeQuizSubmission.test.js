// Route-level tests use an isolated transactional store; no database is opened.
jest.mock('../config/connection', () => ({ transaction: jest.fn() }));
jest.mock('../models', () => ({
  QuizScores: { upsert: jest.fn() },
  Modules: { findOne: jest.fn() },
  Users: { findByPk: jest.fn() },
  CmeCreditAwards: { findOne: jest.fn(), create: jest.fn() },
}));
jest.mock('../middleware/auth', () => (req, res, next) => {
  req.user = { id: 7 };
  next();
});
jest.mock('../middleware/isAdmin', () => (req, res, next) => next());
jest.mock('../services/email', () => ({ sendCme50AchievedEmail: jest.fn() }));
jest.mock('../services/certificates/issueCmeCertificate', () => jest.fn());
jest.mock('../services/credentials/issueCredential', () => jest.fn());
jest.mock('../services/quizScores/saveHighestQuizScore', () => jest.fn());

const express = require('express');
const request = require('supertest');
const sequelize = require('../config/connection');
const { QuizScores, Modules, Users, CmeCreditAwards } = require('../models');
const saveHighestQuizScore = require('../services/quizScores/saveHighestQuizScore');
const issueCmeCertificate = require('../services/certificates/issueCmeCertificate');
const { sendCme50AchievedEmail } = require('../services/email');
const app = express();
app.use(express.json());
app.use('/quiz-scores', require('../controllers/api/moduleRoutes/quizScoreRoutes'));

let store;
let tail;
let transactions;
let testModule;
const submit = (score = 85, date_taken = '2025-04-03T12:00:00Z') =>
  request(app).post('/quiz-scores').send({
    module_id: 'external-module', user_id: 999, score, date_taken,
  });

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers({ doNotFake: [
    'nextTick', 'queueMicrotask', 'setImmediate', 'clearImmediate',
    'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
    'hrtime', 'performance',
  ] });
  jest.setSystemTime(new Date(2026, 5, 15, 12));
  store = { awards: [], quiz: null, credits: 0, year: 2026,
    certificateIssuedAt: null, certificates: [] };
  tail = Promise.resolve();
  transactions = [];
  testModule = { id: 42, credit_type: 'cme', cme_credits: 2, name: 'Test',
    getPrograms: jest.fn().mockResolvedValue([]) };
  Modules.findOne.mockImplementation(async () => testModule);
  sequelize.transaction.mockImplementation(async () => {
    const tx = { LOCK: { UPDATE: 'UPDATE' }, locked: false };
    tx.commit = jest.fn(async () => {
      store = tx.state;
      tx.finished = 'commit';
      tx.release();
    });
    tx.rollback = jest.fn(async () => {
      tx.finished = 'rollback';
      tx.release?.();
    });
    transactions.push(tx);
    return tx;
  });
  Users.findByPk.mockImplementation(async (id, { transaction: tx, lock }) => {
    expect(id).toBe(7);
    expect(lock).toBe(tx.LOCK.UPDATE);
    const previous = tail;
    tail = new Promise(resolve => { tx.release = resolve; });
    await previous;
    tx.locked = true;
    tx.state = structuredClone(store);
    return { id, cme_year: tx.state.year, cme_credits: tx.state.credits,
      cme_certificate_issued_at: tx.state.certificateIssuedAt,
      save: jest.fn(async function ({ transaction }) {
        expect(transaction).toBe(tx);
        tx.state.credits = this.cme_credits;
        tx.state.year = this.cme_year;
        tx.state.certificateIssuedAt = this.cme_certificate_issued_at;
      }) };
  });
  CmeCreditAwards.findOne.mockImplementation(async ({ where, transaction: tx, lock }) => {
    expect(tx.locked).toBe(true);
    expect(lock).toBe(tx.LOCK.UPDATE);
    expect(where).toEqual({ user_id: 7, module_id: 42 });
    return tx.state.awards[0] || null;
  });
  CmeCreditAwards.create.mockImplementation(async (values, { transaction: tx }) => {
    tx.state.awards.push(values);
    return values;
  });
  QuizScores.upsert.mockImplementation(async (values, { transaction: tx }) => {
    expect(tx.locked).toBe(true);
    const created = !tx.state.quiz;
    tx.state.quiz = values;
    return [values, created];
  });
  issueCmeCertificate.mockImplementation(async ({ transaction: tx, ...values }) => {
    expect(tx.locked).toBe(true);
    tx.state.certificates.push(values);
    return values;
  });
});

afterEach(() => jest.useRealTimers());

test('first award records authenticated identity, canonical module, credited score/date and balance', async () => {
  const year = new Date().getFullYear();
  const date = `${year}-04-03T12:00:00Z`;
  const res = await submit(85, date);
  expect(res.status).toBe(201);
  expect(res.body.credits_awarded).toBe(2);
  expect(store.awards).toHaveLength(1);
  expect(store.awards[0]).toMatchObject({ user_id: 7, module_id: 42, year,
    credited_score: 85, credited_date_taken: new Date(date) });
  expect(store.credits).toBe(2);
  expect(transactions[0].commit).toHaveBeenCalledTimes(1);
});

test('sequential duplicate succeeds without another award or balance increment', async () => {
  await submit();
  const res = await submit();
  expect(res.status).toBe(200);
  expect(res.body.credits_awarded).toBe(0);
  expect(store.awards).toHaveLength(1);
  expect(CmeCreditAwards.create).toHaveBeenCalledTimes(1);
  expect(store.credits).toBe(2);
});

test.each([
  ['same year', '2025-06-01T12:00:00Z'],
  ['different years', '2026-06-01T12:00:00Z'],
])('concurrent submissions in %s produce one lifetime award', async (_, secondDate) => {
  const responses = await Promise.all([submit(), submit(95, secondDate)]);
  expect(responses.map(res => res.status).sort()).toEqual([200, 201]);
  expect(responses.map(res => res.body.credits_awarded).sort()).toEqual([0, 2]);
  expect(store.awards).toHaveLength(1);
  expect(CmeCreditAwards.create).toHaveBeenCalledTimes(1);
});

test('passing and failing retakes edit mutable scores but preserve original award and year', async () => {
  await submit();
  const original = structuredClone(store.awards[0]);
  for (const score of [99, 45]) {
    const res = await submit(score, '2026-06-01T12:00:00Z');
    expect(res.status).toBe(200);
    expect(res.body.credits_awarded).toBe(0);
    expect(store.quiz.score).toBe(score);
    expect(store.awards).toEqual([original]);
  }
});

test('legacy zero-credit award remains protected and unknown snapshots remain unknown', async () => {
  store.awards.push({ user_id: 7, module_id: 42, year: 2024, credits_awarded: 0,
    credited_score: null, credited_date_taken: null });
  const original = structuredClone(store.awards);
  expect((await submit(99)).status).toBe(201);
  expect(store.awards).toEqual(original);
  expect(CmeCreditAwards.create).not.toHaveBeenCalled();
});

test('failed CME attempt saves normally and a subsequent pass may earn credit', async () => {
  expect((await submit(40)).status).toBe(201);
  expect(store.awards).toHaveLength(0);
  expect((await submit(90)).body.credits_awarded).toBe(2);
});

test('non-CME continues using the existing highest-score service', async () => {
  testModule.credit_type = 'none';
  saveHighestQuizScore.mockResolvedValue({ quizScore: { score: 70 }, created: false });
  const res = await submit(70);
  expect(res.status).toBe(200);
  expect(saveHighestQuizScore).toHaveBeenCalledWith({ userId: 7, moduleId: 42,
    score: 70, dateTaken: new Date('2025-04-03T12:00:00Z') });
  expect(sequelize.transaction).not.toHaveBeenCalled();
});

test('award failure rolls back mutable score and ledger together; retry succeeds', async () => {
  const log = jest.spyOn(console, 'error').mockImplementation(() => {});
  const original = structuredClone(store);
  CmeCreditAwards.create.mockRejectedValueOnce(new Error('write failed'));
  try {
    expect((await submit()).status).toBe(500);
    expect(store).toEqual(original);
    expect(transactions[0].rollback).toHaveBeenCalledTimes(1);
    expect((await submit()).status).toBe(201);
    expect(store.awards).toHaveLength(1);
  } finally { log.mockRestore(); }
});

test('December completion first accepted in January uses acceptance year and preserves completion', async () => {
  const acceptedAt = new Date(2027, 0, 2, 12);
  const completion = new Date(2026, 11, 28, 12);
  jest.setSystemTime(acceptedAt);
  expect((await submit(90, completion.toISOString())).status).toBe(201);
  expect(store.awards[0]).toMatchObject({ year: 2027, awarded_at: acceptedAt,
    credited_score: 90, credited_date_taken: completion });
  expect(store.quiz.date_taken).toEqual(completion);
  expect(store.year).toBe(2027);
  expect(store.credits).toBe(2);
});

test('December award retried and retaken in January retains every original snapshot', async () => {
  jest.setSystemTime(new Date(2026, 11, 31, 23, 59));
  const completion = new Date(2026, 11, 30, 12).toISOString();
  await submit(85, completion);
  const original = structuredClone(store.awards);
  jest.setSystemTime(new Date(2027, 0, 2));
  for (const [score, date] of [[85, completion], [99, new Date().toISOString()]]) {
    const res = await submit(score, date);
    expect(res.status).toBe(200);
    expect(res.body.credits_awarded).toBe(0);
    expect(store.awards).toEqual(original);
    expect(store.quiz.score).toBe(score);
  }
  expect(store.year).toBe(2026);
  expect(store.credits).toBe(2);
});

test('failed December transaction followed by January success awards only January credits', async () => {
  jest.setSystemTime(new Date(2026, 11, 31, 23, 59));
  const findUser = Users.findByPk.getMockImplementation();
  Users.findByPk.mockImplementationOnce(async (...args) => {
    const user = await findUser(...args);
    user.save.mockRejectedValueOnce(new Error('December balance write failed'));
    return user;
  });
  const log = jest.spyOn(console, 'error').mockImplementation(() => {});
  try {
    expect((await submit()).status).toBe(500);
    expect(store.awards).toEqual([]);
    expect(store.quiz).toBeNull();
    expect(transactions[0].rollback).toHaveBeenCalledTimes(1);
    const january = new Date(2027, 0, 1, 0, 1);
    jest.setSystemTime(january);
    expect((await submit()).body.credits_awarded).toBe(2);
    expect(store.awards).toHaveLength(1);
    expect(store.awards[0]).toMatchObject({ year: 2027, awarded_at: january });
    expect(store.year).toBe(2027);
    expect(store.credits).toBe(2);
  } finally { log.mockRestore(); }
});

test('concurrent submissions spanning New Year retain the first successful December award', async () => {
  const december = new Date(2026, 11, 31, 23, 59, 59);
  jest.setSystemTime(december);
  // Keep the first transaction locked until the second submission requests it.
  let secondRequested;
  const secondRequest = new Promise(resolve => { secondRequested = resolve; });
  const findUser = Users.findByPk.getMockImplementation();
  let requests = 0;
  Users.findByPk.mockImplementation((...args) => {
    requests++;
    if (requests === 2) secondRequested();
    return findUser(...args);
  });
  const create = CmeCreditAwards.create.getMockImplementation();
  CmeCreditAwards.create.mockImplementationOnce(async (...args) => {
    await secondRequest;
    jest.setSystemTime(new Date(2027, 0, 1));
    return create(...args);
  });
  const responses = await Promise.all([submit(), submit(95)]);
  expect(responses.map(res => res.status).sort()).toEqual([200, 201]);
  expect(responses.map(res => res.body.credits_awarded).sort()).toEqual([0, 2]);
  expect(store.awards).toHaveLength(1);
  expect(store.awards[0]).toMatchObject({ year: 2026, awarded_at: december });
  expect(store.year).toBe(2026);
  expect(store.credits).toBe(2);
});

test('capture occurs after the user lock and lifetime lookup, even when they cross midnight', async () => {
  jest.setSystemTime(new Date(2026, 11, 31, 23, 59, 59));
  const lookup = CmeCreditAwards.findOne.getMockImplementation();
  const january = new Date(2027, 0, 1);
  CmeCreditAwards.findOne.mockImplementationOnce(async (...args) => {
    const award = await lookup(...args);
    jest.setSystemTime(january);
    return award;
  });
  await submit();
  expect(store.awards[0]).toMatchObject({ year: 2027, awarded_at: january });
});

test('rollover resets the prior-year balance and certificate without carrying credits forward', async () => {
  store.credits = 49;
  store.year = 2025;
  store.certificateIssuedAt = new Date(2025, 11, 1);
  await submit();
  expect(store.year).toBe(2026);
  expect(store.credits).toBe(2);
  expect(store.certificateIssuedAt).toBeNull();
  expect(issueCmeCertificate).not.toHaveBeenCalled();
});

test('50-credit certificate uses captured award year/time even when creation crosses New Year', async () => {
  const december = new Date(2026, 11, 31, 23, 59, 59);
  jest.setSystemTime(december);
  store.credits = 48;
  const create = CmeCreditAwards.create.getMockImplementation();
  CmeCreditAwards.create.mockImplementationOnce(async (...args) => {
    jest.setSystemTime(new Date(2027, 0, 1));
    return create(...args);
  });
  await submit(90, new Date(2025, 11, 15).toISOString());
  expect(store.credits).toBe(50);
  expect(store.year).toBe(2026);
  expect(store.awards[0]).toMatchObject({ year: 2026, awarded_at: december });
  expect(issueCmeCertificate).toHaveBeenCalledWith({ user_id: 7, year: 2026,
    issued_at: december, transaction: transactions[0] });
  expect(store.certificateIssuedAt).toEqual(december);
  expect(store.certificates).toHaveLength(1);
  expect(sendCme50AchievedEmail).toHaveBeenCalledTimes(1);
  expect(transactions[0].finished).toBe('commit');
  await submit(99);
  expect(store.credits).toBe(50);
  expect(store.certificates).toHaveLength(1);
  expect(sendCme50AchievedEmail).toHaveBeenCalledTimes(1);
});
test('balance-save failure rolls back a newly inserted award and preserves an earlier score', async () => {
  await submit(40);
  const original = structuredClone(store);
  const findUser = Users.findByPk.getMockImplementation();
  Users.findByPk.mockImplementationOnce(async (...args) => {
    const user = await findUser(...args);
    user.save.mockRejectedValueOnce(new Error('balance write failed'));
    return user;
  });
  const log = jest.spyOn(console, 'error').mockImplementation(() => {});
  try {
    expect((await submit(90)).status).toBe(500);
    expect(CmeCreditAwards.create).toHaveBeenCalledTimes(1);
    expect(transactions[1].rollback).toHaveBeenCalledTimes(1);
    expect(store).toEqual(original);
  } finally { log.mockRestore(); }
});
