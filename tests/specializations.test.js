const jwt = require('jsonwebtoken');

jest.mock('../models', () => ({
  findAll: jest.fn(),
  findByPk: jest.fn(),
  findOrCreate: jest.fn(),
  destroy: jest.fn(),
}));

const request = require('supertest');
const Specializations = require('../models');
const app = require('../app');

const SECRET = process.env.SECRET;
const ADMIN_ROLE_ID = 2;
const SUPER_ADMIN_ROLE_ID = 3;

const adminToken = jwt.sign({ id: 2, roleId: ADMIN_ROLE_ID }, SECRET);
const superAdminToken = jwt.sign({ id: 3, roleId: SUPER_ADMIN_ROLE_ID }, SECRET);

describe('Specializations API', () => {
  afterEach(() => jest.clearAllMocks());

  test('Admin can fetch all specializations', async () => {
    Specializations.findAll.mockResolvedValueOnce([]);
    const res = await request(app)
      .get('/specializations/')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('Admin can create a specialization', async () => {
    Specializations.findOrCreate.mockResolvedValueOnce([{}, true]);

    const res = await request(app)
      .post('/specializations/')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Cardiology' });

    expect([200, 201]).toContain(res.statusCode);
    expect(res.body).toHaveProperty('specialization');
  });

  test('Admin cannot create specialization without name', async () => {
    const res = await request(app)
      .post('/specializations/')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/name is required/i);
  });

  test('Admin can update a specialization', async () => {
    Specializations.findByPk.mockResolvedValueOnce({
      update: jest.fn().mockResolvedValue(true),
    });

    const res = await request(app)
      .put('/specializations/1')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Updated Specialization' });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Specialization updated successfully.');
  });

  test('Admin can delete a specialization', async () => {
    Specializations.findByPk.mockResolvedValueOnce({
      destroy: jest.fn().mockResolvedValue(true),
    });

    const res = await request(app)
      .delete('/specializations/1')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Specialization deleted successfully.');
  });
});


