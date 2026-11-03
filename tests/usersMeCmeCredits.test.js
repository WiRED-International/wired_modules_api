// Exercise the real auth middleware and CME calculator with mocked models only.
jest.mock('../models', () => ({
  Users: { findByPk: jest.fn() },
  Roles: {}, QuizScores: {}, Modules: {}, Countries: {}, Organizations: {},
  CmeCreditBalances: { findOne: jest.fn() },
  CmeCreditAwards: { findAll: jest.fn() },
}));
jest.mock('../services/certificates/calculateCmeCreditsBulk', () => jest.fn());

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { Users, Roles, QuizScores, Modules, Countries, Organizations,
  CmeCreditBalances, CmeCreditAwards } = require('../models');
const app = express();
app.use('/users', require('../controllers/api/userRoutes/userRoutes'));
let profile;
let token;
let errorLog;

beforeEach(() => {
  jest.resetAllMocks();
  // Fake only the clock; HTTP and scheduling continue normally.
  jest.useFakeTimers({ doNotFake: [
    'nextTick', 'queueMicrotask', 'setImmediate', 'clearImmediate',
    'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
    'hrtime', 'performance',
  ] });
  jest.setSystemTime(new Date(2026, 5, 15, 12));
  token = jwt.sign({ id: 17, roleId: 1 }, process.env.SECRET);
  errorLog = jest.spyOn(console, 'error').mockImplementation(() => {});
  profile = {
    id: 17, first_name: 'Test', last_name: 'User', email: 'test@example.com',
    createdAt: '2020-01-01T00:00:00.000Z', role: { name: 'User' },
    country: { id: 3, name: 'Country' }, organization: { name: 'Organization' },
    quizScores: [{ score: 99, date_taken: '2026-05-01T12:00:00Z',
      module: { id: 42, name: 'Quiz', module_id: 'external', credit_type: 'cme' } }],
  };
  Users.findByPk.mockResolvedValue({ toJSON: () => profile });
  CmeCreditBalances.findOne.mockResolvedValue(null);
  CmeCreditAwards.findAll.mockResolvedValue([]);
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

const getMe = () => request(app).get('/users/me?userId=999')
  .set('Authorization', `Bearer ${token}`);
const totals = (status, current, previous, year = 2026) => ({
  status, annualRequirement: 50,
  currentYear: { year, earnedCredits: current },
  previousYear: { year: year - 1, earnedCredits: previous },
});

test('uses authenticated ID and both years, preserving profile fields and association queries', async () => {
  CmeCreditBalances.findOne.mockImplementation(async ({ where }) => (
    { opening_credits: where.year === 2026 ? 12 : 20 }
  ));
  CmeCreditAwards.findAll.mockImplementation(async ({ where }) => (
    where.year === 2026
      ? [{ credits_awarded: 4 }, { credits_awarded: 0 }]
      : [{ credits_awarded: 7 }]
  ));
  const res = await getMe();
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ ...profile, cmeCredits: totals('available', 16, 27) });
  expect(Users.findByPk).toHaveBeenCalledWith(17, {
    attributes: ['id', 'first_name', 'last_name', 'email', 'createdAt'],
    include: [
      { model: Roles, as: 'role', attributes: ['name'] },
      { model: QuizScores, as: 'quizScores', attributes: ['score', 'date_taken'],
        include: [{ model: Modules, as: 'module',
          attributes: ['id', 'name', 'module_id', 'credit_type'] }] },
      { model: Countries, as: 'country', attributes: ['name', 'id'] },
      { model: Organizations, as: 'organization', attributes: ['name'] },
    ],
  });
  for (const read of [CmeCreditBalances.findOne, CmeCreditAwards.findAll]) {
    expect(read.mock.calls.map(([options]) => options.where)).toEqual([
      { user_id: 17, year: 2026 }, { user_id: 17, year: 2025 },
    ]);
  }
});

test('real calculator zero balances are available zeroes, regardless of quiz scores', async () => {
  const res = await getMe();
  expect(res.status).toBe(200);
  expect(res.body.cmeCredits).toEqual(totals('available', 0, 0));
});

test.each(['current', 'previous'])('%s-year ledger failure preserves profile and nulls both totals', async failedYear => {
  const failure = new Error('ledger unavailable');
  CmeCreditAwards.findAll.mockImplementation(async ({ where }) => {
    if (where.year === (failedYear === 'current' ? 2026 : 2025)) throw failure;
    return [{ credits_awarded: 30 }];
  });
  const res = await getMe();
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ ...profile, cmeCredits: totals('unavailable', null, null) });
  expect(errorLog).toHaveBeenCalledWith(
    'Failed to calculate CME credits for user 17:', failure
  );
});

test('opening-balance failure also makes both totals unavailable', async () => {
  CmeCreditBalances.findOne.mockRejectedValueOnce(new Error('balance unavailable'));
  const res = await getMe();
  expect(res.status).toBe(200);
  expect(res.body.cmeCredits).toEqual(totals('unavailable', null, null));
});

test('missing user retains 404 and does not read CME data', async () => {
  Users.findByPk.mockResolvedValueOnce(null);
  const res = await getMe();
  expect(res.status).toBe(404);
  expect(res.body).toEqual({ message: 'User not found' });
  expect(CmeCreditBalances.findOne).not.toHaveBeenCalled();
  expect(CmeCreditAwards.findAll).not.toHaveBeenCalled();
});

test.each([
  [null, { success: false, message: 'No Authorization header provided' }],
  ['Bearer invalid', { success: false, error: 'Invalid token',
    message: 'Invalid authentication token provided.' }],
])('authentication rejects %s without reading profile or CME data', async (header, body) => {
  const req = request(app).get('/users/me');
  if (header) req.set('Authorization', header);
  const res = await req;
  expect(res.status).toBe(401);
  expect(res.body).toEqual(body);
  expect(Users.findByPk).not.toHaveBeenCalled();
  expect(CmeCreditBalances.findOne).not.toHaveBeenCalled();
  expect(CmeCreditAwards.findAll).not.toHaveBeenCalled();
});

test('profile lookup failure retains existing 500 error response', async () => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  Users.findByPk.mockRejectedValueOnce(new Error('profile unavailable'));
  const res = await getMe();
  expect(res.status).toBe(500);
  expect(res.body).toEqual({ message: 'profile unavailable' });
  expect(CmeCreditAwards.findAll).not.toHaveBeenCalled();
});

test('captures one server-local year even when calculation crosses New Year', async () => {
  jest.setSystemTime(new Date(2026, 11, 31, 23, 59, 59));
  token = jwt.sign({ id: 17, roleId: 1 }, process.env.SECRET);
  CmeCreditBalances.findOne.mockImplementation(async () => {
    jest.setSystemTime(new Date(2027, 0, 1));
    return null;
  });
  const res = await getMe();
  expect(res.status).toBe(200);
  expect(res.body.cmeCredits).toEqual(totals('available', 0, 0, 2026));
  expect(CmeCreditAwards.findAll.mock.calls.map(([options]) => options.where.year))
    .toEqual([2026, 2025]);
});
