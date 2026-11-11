const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../models', () => ({
  Exams: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    sequelize: {
      fn: jest.fn(),
      col: jest.fn(),
    },
  },
  ExamSessions: {
    findAll: jest.fn(),
    findAndCountAll: jest.fn(),
    findByPk: jest.fn(),
    findOne: jest.fn(),
  },
  ExamUserAccess: {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    destroy: jest.fn(),
  },
  Users: {
    findByPk: jest.fn(),
  },
  ExamQuestions: {
    findAll: jest.fn(),
    bulkCreate: jest.fn(),
  },
  Organizations: {},
  Classes: {},
  ClassEnrollments: {},
  Programs: {},
  AdminPermissions: {
    findAll: jest.fn(),
  },
  ExamTemplates: {},
  ExamTemplateQuestions: {
    findAll: jest.fn(),
  },
}));

const app = require('../app');
const {
  Exams,
  ExamSessions,
  AdminPermissions,
  ExamTemplateQuestions,
} = require('../models');
const ROLES = require('../utils/roles');

const SECRET = process.env.SECRET;
const orgAdminToken = jwt.sign(
  { id: 20, roleId: ROLES.ADMIN, organization_id: 1 },
  SECRET
);
const instructorToken = jwt.sign(
  { id: 40, roleId: ROLES.INSTRUCTOR, organization_id: 2 },
  SECRET
);
const superAdminToken = jwt.sign(
  { id: 30, roleId: ROLES.SUPER_ADMIN },
  SECRET
);

describe('Admin & Instructor Exam Scoping (adminExamRoutes)', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Org Admin (roleId = 2) AdminPermissions scoping', () => {
    test('enforces AdminPermissions on /kpis and /results and prevents ?orgId bypass', async () => {
      AdminPermissions.findAll.mockResolvedValue([{ organization_id: 1 }]);
      ExamSessions.findAll.mockResolvedValueOnce([]);

      const kpiRes = await request(app)
        .get('/api/admin/exams/kpis')
        .set('Authorization', `Bearer ${orgAdminToken}`);

      expect(kpiRes.statusCode).toBe(200);
      expect(AdminPermissions.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { admin_id: 20 },
        })
      );

      // Attempting to filter by an unauthorized orgId (99) returns empty results without querying sessions
      ExamSessions.findAndCountAll.mockClear();
      const bypassRes = await request(app)
        .get('/api/admin/exams/results?orgId=99')
        .set('Authorization', `Bearer ${orgAdminToken}`);

      expect(bypassRes.statusCode).toBe(200);
      expect(bypassRes.body.results).toEqual([]);
      expect(ExamSessions.findAndCountAll).not.toHaveBeenCalled();
    });
  });

  describe('Instructor (roleId = 4) exam scheduling and monitoring', () => {
    test('allows Instructor to schedule an exam from an approved template but blocks ad-hoc template-less creation', async () => {
      const deniedNoTemplate = await request(app)
        .post('/api/admin/exams')
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({
          title: 'Ad-hoc Exam',
          localStart: '2026-11-20T09:00',
          localEnd: '2026-11-20T12:00',
          duration_minutes: 60,
        });

      expect(deniedNoTemplate.statusCode).toBe(403);

      Exams.create.mockResolvedValueOnce({
        id: 800,
        title: 'MOH Final Exam',
        exam_template_id: 5,
      });

      const allowedFromTemplate = await request(app)
        .post('/api/admin/exams')
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({
          title: 'MOH Final Exam',
          localStart: '2026-11-20T09:00',
          localEnd: '2026-11-20T12:00',
          duration_minutes: 60,
          exam_template_id: 5,
        });

      expect(allowedFromTemplate.statusCode).toBe(201);
    });

    test('blocks Instructor from modifying exam questions or updating another organization exam', async () => {
      const modifyQuestionsRes = await request(app)
        .post('/api/admin/exams/800/questions')
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({
          questions: [
            {
              question_text: 'Tampered question?',
              options: { A: '1', B: '2' },
              correct_answers: ['A'],
            },
          ],
        });

      expect(modifyQuestionsRes.statusCode).toBe(403);

      Exams.findByPk.mockResolvedValueOnce({
        id: 801,
        exam_template_id: 5,
        classes: [{ id: 99, organization_id: 999 }],
      });

      const updateOtherOrgExam = await request(app)
        .put('/api/admin/exams/801')
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({
          title: 'Updated Title',
          localStart: '2026-11-20T09:00',
          localEnd: '2026-11-20T12:00',
          duration_minutes: 60,
        });

      expect(updateOtherOrgExam.statusCode).toBe(403);
    });
  });

  describe('PUT /api/admin/exams/:examId assignment authorization', () => {
    const updatePayload = {
      title: 'Updated MOH Exam',
      localStart: '2026-11-20T09:00',
      localEnd: '2026-11-20T12:00',
      duration_minutes: 60,
    };

    test.each([
      ['unassigned', []],
      ['missing class association', undefined],
      ['outside their organization', [{ id: 99, organization_id: 999 }]],
      ['mixed organizations', [
        { id: 12, organization_id: 2 },
        { id: 99, organization_id: 999 },
      ]],
    ])('denies Instructor edits for %s exams without updating them', async (_label, classes) => {
      const update = jest.fn().mockResolvedValue(undefined);
      Exams.findByPk.mockResolvedValueOnce({
        id: 801,
        exam_template_id: 5,
        classes,
        update,
      });

      const res = await request(app)
        .put('/api/admin/exams/801')
        .set('Authorization', `Bearer ${instructorToken}`)
        .send(updatePayload);

      expect(res.statusCode).toBe(403);
      expect(update).not.toHaveBeenCalled();
    });

    test.each([
      ['Instructor within their organization', instructorToken, [{ id: 12, organization_id: 2 }]],
      ['Super Admin with an unassigned exam', superAdminToken, []],
      ['Super Admin with a cross-organization exam', superAdminToken, [
        { id: 12, organization_id: 2 },
        { id: 99, organization_id: 999 },
      ]],
      ['Org Admin with an unassigned exam', orgAdminToken, []],
    ])('preserves editing for %s', async (_label, token, classes) => {
      const update = jest.fn().mockResolvedValue(undefined);
      Exams.findByPk.mockResolvedValueOnce({
        id: 801,
        exam_template_id: 5,
        classes,
        update,
      });

      const res = await request(app)
        .put('/api/admin/exams/801')
        .set('Authorization', `Bearer ${token}`)
        .send(updatePayload);

      expect(res.statusCode).toBe(200);
      expect(update).toHaveBeenCalledTimes(1);
      expect(update).toHaveBeenCalledWith(expect.objectContaining({
        title: updatePayload.title,
        duration_minutes: updatePayload.duration_minutes,
        exam_template_id: 5,
      }));
    });
  });

  describe('GET /api/admin/exams/sessions/:sessionId/details scoping & answer-key protection', () => {
    test('restricts session access by organization and hides correct_answers from non-Super-Admins', async () => {
      const sessionInOrg2 = {
        id: 700,
        exam_id: 800,
        score: 90,
        submitted_at: new Date(),
        attempt_number: 1,
        answers: [{ question_id: 1, selected_option_ids: ['A'] }],
        users: {
          id: 501,
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com',
          organization_id: 2,
          organization: { id: 2, name: 'Kisumu MOH' },
        },
        class: {
          id: 12,
          name: 'MOH Cohort',
          organization_id: 2,
          program_id: 1,
        },
        exams: { id: 800, title: 'MOH Final', exam_template_id: 5 },
      };

      ExamSessions.findByPk.mockResolvedValue(sessionInOrg2);
      ExamTemplateQuestions.findAll.mockResolvedValue([
        {
          id: 1,
          question_text: 'Q1',
          options: { A: 'Right', B: 'Wrong' },
          correct_answers: ['A'],
        },
      ]);

      // Org Admin for Org 1 cannot view Org 2 session
      AdminPermissions.findAll.mockResolvedValueOnce([{ organization_id: 1 }]);
      const orgAdminDenied = await request(app)
        .get('/api/admin/exams/sessions/700/details')
        .set('Authorization', `Bearer ${orgAdminToken}`);
      expect(orgAdminDenied.statusCode).toBe(403);

      // Instructor in Org 2 can view session, but correct_answers is omitted
      const instructorAllowed = await request(app)
        .get('/api/admin/exams/sessions/700/details')
        .set('Authorization', `Bearer ${instructorToken}`);
      expect(instructorAllowed.statusCode).toBe(200);
      expect(instructorAllowed.body.questions[0].is_correct).toBe(true);
      expect(instructorAllowed.body.questions[0].correct_answers).toBeUndefined();

      // Super Admin sees correct_answers
      const superAdminAllowed = await request(app)
        .get('/api/admin/exams/sessions/700/details')
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(superAdminAllowed.statusCode).toBe(200);
      expect(superAdminAllowed.body.questions[0].correct_answers).toEqual(['A']);
    });
  });
});
