const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../models', () => ({
  Users: {
    findByPk: jest.fn(),
  },
  Classes: {
    findByPk: jest.fn(),
  },
  Programs: {},
  Organizations: {},
  Locations: {},
  ClassEnrollments: {
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
  },
  ClassEnrollmentSpecializations: {
    findOne: jest.fn(),
    create: jest.fn(),
  },
  Specializations: {
    findByPk: jest.fn(),
  },
  AdminPermissions: {
    findOne: jest.fn(),
  },
  Exams: {
    findByPk: jest.fn(),
    findOne: jest.fn(),
  },
  ExamQuestions: {
    findAll: jest.fn(),
  },
  ExamTemplateQuestions: {
    findAll: jest.fn(),
  },
  ExamSessions: {
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    getTableName: jest.fn(() => 'exam_sessions'),
  },
  ExamUserAccess: {
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
  },
}));

const app = require('../app');
const {
  Users,
  Classes,
  ClassEnrollments,
  Exams,
  ExamQuestions,
  ExamTemplateQuestions,
  ExamSessions,
  ExamUserAccess,
} = require('../models');
const ROLES = require('../utils/roles');

const SECRET = process.env.SECRET;
const learnerToken = jwt.sign({ id: 101, roleId: ROLES.USER, organization_id: 1 }, SECRET);
const adminToken = jwt.sign({ id: 202, roleId: ROLES.ADMIN, organization_id: 1 }, SECRET);
const superAdminToken = jwt.sign({ id: 303, roleId: ROLES.SUPER_ADMIN }, SECRET);

describe('MOH Exam Readiness & Exam Endpoint Protection', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Automatic ExamUserAccess on class enrollment', () => {
    test('self-enrollment grants ExamUserAccess for exams already assigned to the class', async () => {
      Users.findByPk.mockResolvedValueOnce({ id: 101, organization_id: 1 });
      Classes.findByPk
        .mockResolvedValueOnce({
          id: 50,
          organization_id: 1,
          status: 'active',
          end_date: '2026-12-31',
          enrollment_deadline: '2026-12-15',
          program: { id: 1, training_type: 'basic' },
        })
        .mockResolvedValueOnce({
          id: 50,
          exams: [{ id: 900 }, { id: 901 }],
        });
      ClassEnrollments.findOne.mockResolvedValueOnce(null);
      ClassEnrollments.create.mockResolvedValueOnce({
        id: 1,
        user_id: 101,
        class_id: 50,
        status: 'enrolled',
      });
      ExamUserAccess.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 77, exam_id: 901, user_id: 101 });
      ExamUserAccess.create.mockResolvedValue({ id: 78 });

      const res = await request(app)
        .post('/api/classes/50/enroll')
        .set('Authorization', `Bearer ${learnerToken}`)
        .send({});

      expect(res.statusCode).toBe(201);
      expect(ExamUserAccess.create).toHaveBeenCalledTimes(1);
      expect(ExamUserAccess.create).toHaveBeenCalledWith({
        exam_id: 900,
        user_id: 101,
        max_attempts: 1,
        granted_by: 101,
      });
    });

    test('admin manual enrollment grants ExamUserAccess for exams already assigned to the class', async () => {
      Classes.findByPk
        .mockResolvedValueOnce({
          id: 55,
          organization_id: 1,
          status: 'active',
        })
        .mockResolvedValueOnce({
          id: 55,
          exams: [{ id: 905 }],
        });
      Users.findByPk.mockResolvedValueOnce({ id: 101, organization_id: 1 });
      ClassEnrollments.findOne.mockResolvedValueOnce(null);
      ClassEnrollments.create.mockResolvedValueOnce({
        id: 2,
        user_id: 101,
        class_id: 55,
        status: 'enrolled',
      });
      ExamUserAccess.findOne.mockResolvedValueOnce(null);
      ExamUserAccess.create.mockResolvedValueOnce({ id: 79 });

      const res = await request(app)
        .post('/api/admin/classes/55/enrollments')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ user_id: 101 });

      expect(res.statusCode).toBe(201);
      expect(ExamUserAccess.create).toHaveBeenCalledWith({
        exam_id: 905,
        user_id: 101,
        max_attempts: 1,
        granted_by: 303,
      });
    });
  });

  describe('GET /exams/assigned', () => {
    test('always returns a JSON array of open and upcoming exams and ignores closed exams', async () => {
      const now = Date.now();
      const pastStart = new Date(now - 7 * 24 * 3600 * 1000);
      const pastEnd = new Date(now - 6 * 24 * 3600 * 1000);
      const openStart = new Date(now - 3600 * 1000);
      const openEnd = new Date(now + 3600 * 1000);
      const upcomingStart = new Date(now + 24 * 3600 * 1000);
      const upcomingEnd = new Date(now + 48 * 3600 * 1000);

      ClassEnrollments.findAll.mockResolvedValueOnce([]);
      ExamUserAccess.findAll.mockResolvedValueOnce([
        {
          id: 3,
          exams: {
            id: 10,
            title: 'Old Closed Exam',
            description: 'Closed',
            duration_minutes: 60,
            available_from: pastStart,
            available_until: pastEnd,
          },
        },
        {
          id: 2,
          exams: {
            id: 20,
            title: 'Upcoming Exam',
            description: 'Upcoming',
            duration_minutes: 90,
            available_from: upcomingStart,
            available_until: upcomingEnd,
          },
        },
        {
          id: 1,
          exams: {
            id: 30,
            title: 'Active MOH Final Exam',
            description: 'Open now',
            duration_minutes: 120,
            available_from: openStart,
            available_until: openEnd,
          },
        },
      ]);

      const res = await request(app)
        .get('/exams/assigned')
        .set('Authorization', `Bearer ${learnerToken}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.map((e) => e.exam_id)).toEqual([30, 20]);
      expect(res.body[0].status).toBe('open');
      expect(res.body[1].status).toBe('upcoming');
    });
  });

  describe('GET /exams/:id/questions authorization', () => {
    test('blocks learners without ExamUserAccess or outside the exam availability window', async () => {
      const now = Date.now();
      Exams.findByPk.mockResolvedValueOnce({
        id: 70,
        exam_template_id: 5,
        available_from: new Date(now - 3600 * 1000),
        available_until: new Date(now + 3600 * 1000),
      });
      ClassEnrollments.findAll.mockResolvedValueOnce([]);
      ExamUserAccess.findOne.mockResolvedValueOnce(null);

      const denied = await request(app)
        .get('/exams/70/questions')
        .set('Authorization', `Bearer ${learnerToken}`);

      expect(denied.statusCode).toBe(403);
      expect(denied.body.message).toMatch(/Access not granted/i);

      Exams.findByPk.mockResolvedValueOnce({
        id: 70,
        exam_template_id: 5,
        available_from: new Date(now - 3600 * 1000),
        available_until: new Date(now + 3600 * 1000),
      });
      ClassEnrollments.findAll.mockResolvedValueOnce([]);
      ExamUserAccess.findOne.mockResolvedValueOnce({ id: 1, exam_id: 70, user_id: 101 });
      ExamTemplateQuestions.findAll.mockResolvedValueOnce([
        { id: 1, question_text: 'Q1', options: { A: '1', B: '2' } },
      ]);

      const allowed = await request(app)
        .get('/exams/70/questions')
        .set('Authorization', `Bearer ${learnerToken}`);

      expect(allowed.statusCode).toBe(200);
      expect(allowed.body).toHaveLength(1);
    });
  });

  describe('GET /exam-sessions/exam-sessions/:id/details answer-key protection', () => {
    test('omits correct_answers for non-Super-Admins and includes them for Super Admins', async () => {
      const mockSession = {
        id: 500,
        exam_id: 70,
        score: 85,
        submitted_at: new Date(),
        answers: { 1: ['A'] },
        exams: { id: 70, title: 'MOH Exam', exam_template_id: 5 },
      };

      ExamSessions.findByPk.mockResolvedValue(mockSession);
      ExamTemplateQuestions.findAll.mockResolvedValue([
        {
          id: 1,
          question_text: 'Question 1',
          options: { A: 'Yes', B: 'No' },
          correct_answers: ['A'],
        },
      ]);

      const adminRes = await request(app)
        .get('/exam-sessions/exam-sessions/500/details')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(adminRes.statusCode).toBe(200);
      expect(adminRes.body.questions[0].correct_answers).toBeUndefined();

      const superAdminRes = await request(app)
        .get('/exam-sessions/exam-sessions/500/details')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(superAdminRes.statusCode).toBe(200);
      expect(superAdminRes.body.questions[0].correct_answers).toEqual(['A']);
    });
  });
});
