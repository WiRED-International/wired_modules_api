const request = require('supertest');
const jwt = require('jsonwebtoken');
const sequelize = require('../config/connection');

jest.mock('../services/email', () => ({
  sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
}));

const mockSendRawEmailPromise = jest.fn().mockResolvedValue({});
const mockSendRawEmail = jest.fn(() => ({ promise: mockSendRawEmailPromise }));

jest.mock('aws-sdk', () => {
  const actual = jest.requireActual('aws-sdk');
  return {
    ...actual,
    config: { update: jest.fn() },
    SES: jest.fn(() => ({
      sendRawEmail: mockSendRawEmail,
    })),
  };
});

jest.mock('../models', () => ({
  Users: {
    findOne: jest.fn(),
    findByPk: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
  },
  Countries: {
    findByPk: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
  },
  Cities: {
    findByPk: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
  },
  Organizations: {
    findByPk: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
  },
  Roles: {
    findByPk: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
  },
  Packages: {
    findByPk: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
  },
  Letters: {
    findByPk: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
  },
  Modules: {
    findByPk: jest.fn(),
  },
  SubCategories: {
    findByPk: jest.fn(),
  },
  Downloads: {
    findAll: jest.fn(),
  },
  AdminPermissions: {
    findAll: jest.fn(),
  },
  QuizScores: {},
  Specializations: {},
  Programs: {},
  ClassEnrollments: {},
  ClassEnrollmentSpecializations: {},
}));

const app = require('../app');
const { Users, Packages, Roles, Downloads } = require('../models');
const ROLES = require('../utils/roles');

const SECRET = process.env.SECRET;
const userToken = jwt.sign({ id: 10, roleId: ROLES.USER }, SECRET);
const adminToken = jwt.sign(
  { id: 20, roleId: ROLES.ADMIN, organization_id: 1, country_id: 1 },
  SECRET
);
const superAdminToken = jwt.sign({ id: 30, roleId: ROLES.SUPER_ADMIN }, SECRET);

describe('Core API Security & Access Control Hardening', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /auth/register', () => {
    test('ignores client-supplied role_id and strips password hash from response', async () => {
      jest.spyOn(sequelize, 'transaction').mockResolvedValueOnce({
        commit: jest.fn().mockResolvedValue(undefined),
        rollback: jest.fn().mockResolvedValue(undefined),
      });
      Users.findOne.mockResolvedValueOnce(null);
      Users.create.mockImplementationOnce(async (payload) => ({
        id: 101,
        ...payload,
        password: '$2a$10$hashedpasswordvalue',
        save: jest.fn().mockResolvedValue(undefined),
        reload: jest.fn().mockResolvedValue(undefined),
        toJSON() {
          return {
            id: this.id,
            first_name: this.first_name,
            last_name: this.last_name,
            email: this.email,
            role_id: this.role_id,
            password: this.password,
          };
        },
      }));

      const res = await request(app).post('/auth/register').send({
        first_name: 'Test',
        last_name: 'Learner',
        email: 'learner@example.com',
        role_id: ROLES.SUPER_ADMIN,
        password: 'Password123!',
      });

      expect(res.statusCode).toBe(201);
      expect(Users.create).toHaveBeenCalledWith(
        expect.objectContaining({
          role_id: ROLES.USER,
        }),
        expect.anything()
      );
      expect(res.body.user.role_id).toBe(ROLES.USER);
      expect(res.body.user.password).toBeUndefined();

      const decoded = jwt.verify(res.body.token, SECRET);
      expect(decoded.roleId).toBe(ROLES.USER);
    });
  });

  describe('Reference-data write route protection', () => {
    test('keeps GET /packages public while blocking unauthenticated and non-Super-Admin writes', async () => {
      Packages.findAll.mockResolvedValueOnce([{ id: 1, name: 'Pkg A' }]);
      const getRes = await request(app).get('/packages');
      expect(getRes.statusCode).toBe(200);

      const unauthPost = await request(app)
        .post('/packages')
        .send({ name: 'Malicious Package' });
      expect(unauthPost.statusCode).toBe(401);

      const userPost = await request(app)
        .post('/packages')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Malicious Package' });
      expect(userPost.statusCode).toBe(403);

      const adminPost = await request(app)
        .post('/packages')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Malicious Package' });
      expect(adminPost.statusCode).toBe(403);

      Packages.create.mockResolvedValueOnce({ id: 2, name: 'Valid Package' });
      const superAdminPost = await request(app)
        .post('/packages')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ name: 'Valid Package' });
      expect(superAdminPost.statusCode).toBe(201);
    });

    test('blocks unauthenticated writes across roles, organizations, countries, cities, and letters', async () => {
      const endpoints = [
        ['post', '/roles'],
        ['put', '/roles/1'],
        ['delete', '/roles/1'],
        ['post', '/organizations'],
        ['put', '/organizations/1'],
        ['delete', '/organizations/1'],
        ['post', '/countries'],
        ['put', '/countries/1'],
        ['delete', '/countries/1'],
        ['post', '/cities'],
        ['put', '/cities/1'],
        ['delete', '/cities/1'],
        ['post', '/letters'],
        ['put', '/letters/1'],
        ['delete', '/letters/1'],
        ['post', '/modules-to-letters/modules-to-letters'],
        ['post', '/modules-to-subCategories/modules-to-subCategories'],
      ];

      for (const [method, path] of endpoints) {
        const res = await request(app)[method](path).send({});
        expect(res.statusCode).toBe(401);
      }

      Roles.create.mockResolvedValueOnce({ id: 5, name: 'Tester' });
      const allowed = await request(app)
        .post('/roles')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ name: 'Tester' });
      expect(allowed.statusCode).toBe(200);
    });
  });

  describe('GET /api/downloads distance validation', () => {
    test('rejects SQL injection payloads or negative distance values before querying', async () => {
      const res = await request(app)
        .get('/api/downloads')
        .query({
          latitude: '0.1',
          longitude: '34.7',
          distance: '10 OR 1=1--',
        })
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.statusCode).toBe(400);
      expect(Downloads.findAll).not.toHaveBeenCalled();

      Downloads.findAll.mockResolvedValueOnce([]);
      const okRes = await request(app)
        .get('/api/downloads')
        .query({
          latitude: '0.1',
          longitude: '34.7',
          distance: '25',
        })
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(okRes.statusCode).toBe(200);
      expect(Downloads.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('POST /email/upload-pdf MIME header sanitization', () => {
    test('strips CR/LF from senderName and rejects injected recipient headers', async () => {
      const badRecipientRes = await request(app)
        .post('/email/upload-pdf')
        .set('Authorization', `Bearer ${userToken}`)
        .field('recipient', 'victim@example.com\r\nBcc: attacker@evil.com')
        .field('senderName', 'Alice')
        .attach('file', Buffer.from('%PDF-1.4 test'), 'report.pdf');

      expect(badRecipientRes.statusCode).toBe(400);
      expect(mockSendRawEmail).not.toHaveBeenCalled();

      const okRes = await request(app)
        .post('/email/upload-pdf')
        .set('Authorization', `Bearer ${userToken}`)
        .field('recipient', 'learner@example.com')
        .field('senderName', 'Alice\r\nBcc: attacker@evil.com')
        .attach('file', Buffer.from('%PDF-1.4 test'), 'report.pdf');

      expect(okRes.body).toEqual({ message: 'Email sent successfully' });
      expect(okRes.statusCode).toBe(200);
      expect(mockSendRawEmail).toHaveBeenCalledTimes(1);
      const rawBuffer = mockSendRawEmail.mock.calls[0][0].RawMessage.Data;
      const rawText = rawBuffer.toString('utf8');
      expect(rawText).toContain('Subject: CME Report from Alice Bcc: attacker@evil.com\n');
      expect(rawText).not.toContain('\r\nBcc:');
      expect(rawText).toContain('Content-Disposition: attachment; filename="report.pdf"\n');
    });
  });

  describe('User route role & self-ID checks', () => {
    test('Super Admin can assign ROLES.INSTRUCTOR (4) via PUT /users/:id', async () => {
      Users.findByPk
        .mockResolvedValueOnce({
          id: 42,
          role_id: ROLES.USER,
          update: jest.fn().mockResolvedValue(true),
        })
        .mockResolvedValueOnce({
          id: 42,
          role_id: ROLES.INSTRUCTOR,
        });

      const res = await request(app)
        .put('/users/42')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ role_id: ROLES.INSTRUCTOR });

      expect(res.statusCode).toBe(200);
    });

    test('Admin cannot delete their own account even when :id is a string param', async () => {
      const res = await request(app)
        .delete('/users/20')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toMatch(/cannot delete your own user account/i);
    });
  });
});
