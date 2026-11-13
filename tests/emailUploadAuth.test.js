const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const ROLES = require('../utils/roles');

const mockSendRawEmail = jest.fn(() => ({ promise: async () => ({}) }));
const mockProcessUpload = jest.fn();

jest.mock('aws-sdk', () => ({
  config: { update: jest.fn() },
  SES: jest.fn(() => ({ sendRawEmail: mockSendRawEmail })),
}));

// Observe entry into the real Multer middleware without replacing its parsing.
jest.mock('multer', () => {
  const multer = jest.requireActual('multer');
  return (options) => {
    const upload = multer(options);
    return {
      single: (field) => {
        const parse = upload.single(field);
        return (req, res, next) => {
          mockProcessUpload();
          return parse(req, res, next);
        };
      },
    };
  };
});

const app = express();
app.use('/email', require('../controllers/api/emailRoutes'));
app.use((err, req, res, next) => {
  res.status(400).json({ code: err.code });
});

const learnerToken = jwt.sign({ id: 10, roleId: ROLES.USER }, process.env.SECRET);
const expiredToken = jwt.sign(
  { id: 10, roleId: ROLES.USER, exp: 1 }, process.env.SECRET
);
const pdf = Buffer.from('%PDF-1.4 test');

function multipart(token, recipient = 'learner@example.com', file = pdf) {
  const req = request(app).post('/email/upload-pdf');
  if (token) req.set('Authorization', `Bearer ${token}`);
  return req
    .field('recipient', recipient)
    .field('senderName', 'HealthMAP Learner')
    .field('message', 'Your CME report')
    .attach('file', file, 'My CME Report.pdf');
}

describe('CME PDF email JWT authentication', () => {
  afterEach(() => jest.clearAllMocks());

  test.each([
    ['missing', undefined, { success: false, message: 'No Authorization header provided' }],
    ['invalid', 'invalid-token', {
      success: false, error: 'Invalid token', message: 'Invalid authentication token provided.',
    }],
    ['expired', expiredToken, {
      success: false, error: 'Token expired', message: 'Your session has expired. Please log in again.',
    }],
  ])('rejects %s JWT before multipart processing or SES', async (_label, token, body) => {
    const res = await multipart(token);
    expect(mockProcessUpload).not.toHaveBeenCalled();
    expect(mockSendRawEmail).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual(body);
  });

  test('accepts a learner JWT and preserves multipart, attachment and success contracts', async () => {
    const res = await multipart(learnerToken);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ message: 'Email sent successfully' });
    expect(mockProcessUpload).toHaveBeenCalledTimes(1);
    expect(mockSendRawEmail).toHaveBeenCalledTimes(1);
    const raw = mockSendRawEmail.mock.calls[0][0].RawMessage.Data.toString('utf8');
    expect(raw).toContain('To: learner@example.com\n');
    expect(raw).toContain('Subject: CME Report from HealthMAP Learner\n');
    expect(raw).toContain('Your CME report\n');
    expect(raw).toContain('Content-Disposition: attachment; filename="My CME Report.pdf"\n');
    expect(raw).toContain(pdf.toString('base64'));
  });

  test('preserves recipient validation for authenticated learners', async () => {
    const res = await multipart(learnerToken, 'invalid-recipient');
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ message: 'A valid recipient email is required' });
    expect(mockSendRawEmail).not.toHaveBeenCalled();
  });

  test('preserves the 10 MiB upload limit', async () => {
    const res = await multipart(learnerToken, undefined, Buffer.alloc(10 * 1024 * 1024 + 1));
    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe('LIMIT_FILE_SIZE');
    expect(mockSendRawEmail).not.toHaveBeenCalled();
  });
});
