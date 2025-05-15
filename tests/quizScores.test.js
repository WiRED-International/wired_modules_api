const jwt = require('jsonwebtoken');

// Mock FIRST before any imports!
jest.mock('../models', () => ({
  QuizScores: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    upsert: jest.fn(),
    destroy: jest.fn(),
  },
  Modules: {
    findOne: jest.fn(),
  },
}));

const request = require('supertest');
const { QuizScores, Modules } = require('../models');
const app = require('../app');

const SECRET = process.env.SECRET;
const USER_ROLE_ID = 1;
const ADMIN_ROLE_ID = 2;
const SUPER_ADMIN_ROLE_ID = 3;

const userToken = jwt.sign({ id: 1, roleId: USER_ROLE_ID }, SECRET);
const adminToken = jwt.sign({ id: 2, roleId: ADMIN_ROLE_ID }, SECRET);
const superAdminToken = jwt.sign({ id: 3, roleId: SUPER_ADMIN_ROLE_ID }, SECRET);

describe('Quiz Scores API', () => {
  afterEach(() => jest.clearAllMocks());

  test('User cannot create a quiz score', async () => {
    const res = await request(app)
      .post('/quiz-scores/')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ module_id: '1234', user_id: 1, score: 90.00 });

    expect(res.statusCode).toBe(403);
    expect(res.body.message).toMatch(/only admins can create or edit quiz scores/i);
  });

  test('Admin can fetch all quiz scores', async () => {
    QuizScores.findAll.mockResolvedValueOnce([]);
    const res = await request(app)
      .get('/quiz-scores/')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('Admin can create a quiz score', async () => {
    QuizScores.upsert.mockResolvedValueOnce([{}, true]);
    Modules.findOne.mockResolvedValueOnce({ id: 1, module_id: '1234' });

    const res = await request(app)
      .post('/quiz-scores/')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ module_id: '1234', user_id: 1, score: 90.00 });

    expect([200, 201]).toContain(res.statusCode);
    expect(res.body).toHaveProperty('quizScore');
  });

  test('Admin can delete a quiz score', async () => {
    QuizScores.findByPk.mockResolvedValueOnce({
      destroy: jest.fn().mockResolvedValue(true),
    });

    const res = await request(app)
      .delete('/quiz-scores/1')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Quiz Score deleted successfully');
  });

  test('Super Admin can create a quiz score', async () => {
    Modules.findOne.mockResolvedValueOnce({ id: 1, module_id: '1234' });
    QuizScores.upsert.mockResolvedValueOnce([{}, true]);

    const res = await request(app)
      .post('/quiz-scores/')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ module_id: '1234', user_id: 1, score: 90.00 });

    expect([200, 201]).toContain(res.statusCode);
    expect(res.body).toHaveProperty('quizScore');
  });
});
