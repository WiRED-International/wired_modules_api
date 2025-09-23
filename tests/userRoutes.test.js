const request = require('supertest');
const app = require('../app');
const { Users } = require('../models');
const jwt = require('jsonwebtoken');

// Constants
const SECRET = process.env.SECRET;
const USER_ROLE_ID = 1;
const ADMIN_ROLE_ID = 2;
const SUPER_ADMIN_ROLE_ID = 3;

// Mock Tokens using actual users from your DB
const userToken = jwt.sign({ id: 1, roleId: USER_ROLE_ID }, SECRET);
const adminToken = jwt.sign({ id: 2, roleId: ADMIN_ROLE_ID, organization_id: 1, country_id: 1, city_id: 1 }, SECRET);
const superAdminToken = jwt.sign({ id: 3, roleId: SUPER_ADMIN_ROLE_ID }, SECRET);

// Mock User Model
jest.mock('../models', () => {
  return {
    Users: {
      findByPk: jest.fn(),
      findOne: jest.fn(),
      findAll: jest.fn(),
    },
  };
});

describe('User Update Routes', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('User can update their own profile', async () => {
    Users.findByPk.mockResolvedValueOnce({
      id: 1,
      update: jest.fn().mockResolvedValue(true),
    });

    const res = await request(app)
      .put('/users/')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ first_name: 'Updated', email: 'updated@example.com' });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("User updated successfully");
  });

  test('Admin cannot update country_id, city_id, or organization_id', async () => {
    Users.findByPk.mockResolvedValueOnce({
      id: 5,
      role_id: USER_ROLE_ID,
      update: jest.fn(),
    });

    const res = await request(app)
      .put('/users/5')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        country_id: 2,
        city_id: 3,
        organization_id: 4,
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe(
      "You are not allowed to update the following fields: country_id, city_id, organization_id"
    );
  });

  test('User cannot update restricted fields', async () => {
    Users.findByPk.mockResolvedValueOnce({ id: 1 });

    const res = await request(app)
      .put('/users/')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ role_id: ADMIN_ROLE_ID, organization_id: 5 });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("No valid updates provided");
  });

  test('Admin can update a regular user within scope', async () => {
    Users.findByPk.mockResolvedValueOnce({
      id: 5,
      role_id: USER_ROLE_ID,
      organization_id: 1,
      country_id: 1,
      city_id: 1,
      update: jest.fn().mockResolvedValue(true),
    });

    const res = await request(app)
      .put('/users/5')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ first_name: 'JaneUpdated', last_name: 'DoeUpdated' });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("User updated successfully");
  });

  test('Admin cannot update user outside their organization', async () => {
    Users.findByPk.mockResolvedValueOnce({
      id: 6,
      role_id: USER_ROLE_ID,
      organization_id: 99,
      country_id: 2,
      city_id: 3,
    });

    const res = await request(app)
      .put('/users/6')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ first_name: 'ShouldFail' });

    expect(res.statusCode).toBe(403);
    expect(res.body.message).toMatch(/assigned country and organization/);
  });

  test('Admin cannot update another Admin', async () => {
    Users.findByPk.mockResolvedValueOnce({
      id: 7,
      role_id: ADMIN_ROLE_ID,
      organization_id: 1,
      country_id: 1,
      city_id: 1,
    });

    const res = await request(app)
      .put('/users/7')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ first_name: 'Blocked' });

    expect(res.statusCode).toBe(403);
    expect(res.body.message).toMatch(/You do not have permission to update another admin/);
  });

  test('Super Admin can update role_id', async () => {
    Users.findByPk.mockResolvedValueOnce({
      id: 8,
      role_id: USER_ROLE_ID,
      update: jest.fn().mockResolvedValue(true),
    });

    const res = await request(app)
      .put('/users/8')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ role_id: ADMIN_ROLE_ID });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("User updated successfully");
  });

  test('Super Admin provides invalid role_id', async () => {
    Users.findByPk.mockResolvedValueOnce({
      id: 8,
      role_id: USER_ROLE_ID,
      update: jest.fn(), // Should not be called, but mock it to prevent errors
    });

    const res = await request(app)
      .put('/users/8')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ role_id: 999 }); // Invalid role_id

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("Invalid role_id provided for user being updated");
  });

  test('Super Admin can update country_id, city_id, and organization_id', async () => {
    Users.findByPk.mockResolvedValueOnce({
      id: 9,
      role_id: USER_ROLE_ID,
      update: jest.fn().mockResolvedValue(true),
    });

    const res = await request(app)
      .put('/users/9')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
      country_id: 5,
      city_id: 10,
      organization_id: 15,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("User updated successfully");
  });

test('Admin can only view users in their assigned country and organization', async () => {
  const mockUsers = [
    { id: 1, role_id: 1, country_id: 1, organization_id: 1 },
  ];

  Users.findAll.mockResolvedValue(mockUsers);

  const res = await request(app)
    .get('/users')
    .set('Authorization', `Bearer ${adminToken}`);

  console.log('[RESPONSE BODY]', res.body); 

  expect(res.statusCode).toBe(200);
  expect(Array.isArray(res.body)).toBe(true);
  expect(res.body.length).toBe(1);
  expect(res.body[0].country_id).toBe(1);
  expect(res.body[0].organization_id).toBe(1);
});

});

