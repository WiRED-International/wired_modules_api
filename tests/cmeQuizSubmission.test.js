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
  store = { awards: [], quiz: null, credits: 0 };
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
    return { id, cme_year: new Date().getFullYear(), cme_credits: tx.state.credits,
      save: jest.fn(async function () { tx.state.credits = this.cme_credits; }) };
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
});

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
  CmeCreditAwards.create.mockRejectedValueOnce(new Error('write failed'));
  try {
    expect((await submit()).status).toBe(500);
    expect(store).toEqual({ awards: [], quiz: null, credits: 0 });
    expect(transactions[0].rollback).toHaveBeenCalledTimes(1);
    expect((await submit()).status).toBe(201);
    expect(store.awards).toHaveLength(1);
  } finally { log.mockRestore(); }
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
