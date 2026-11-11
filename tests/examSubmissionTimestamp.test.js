const express = require('express');
const request = require('supertest');

jest.mock('../models', () => ({
  ExamSessions: {
    findByPk: jest.fn(),
    getTableName: jest.fn(() => 'exam_sessions'),
  },
}));
jest.mock('../middleware/auth', () => (req, res, next) => {
  req.user = { id: 101 };
  next();
});
jest.mock('../utils/examUtils', () => ({ calculateScore: jest.fn() }));
jest.mock('../services/credentials/issueCredential', () => jest.fn());

const { ExamSessions } = require('../models');
const { calculateScore } = require('../utils/examUtils');
const issueCredential = require('../services/credentials/issueCredential');
const app = express();
app.use(express.json());
app.use('/exam-sessions', require('../controllers/api/examRoutes/examSessionsRoutes'));

describe('Exam submission server receipt timestamp', () => {
  const receivedAt = new Date('2026-11-10T12:00:00.000Z');
  const answers = [{
    question_id: 1,
    selected_option: 'A',
    updated_at: '2026-11-08T10:00:00.000Z',
  }];
  let update;

  beforeEach(() => {
    jest.clearAllMocks();
    // Freeze Date while leaving HTTP, scheduling, and request timeouts real.
    jest.useFakeTimers({
      now: receivedAt,
      doNotFake: [
        'nextTick', 'queueMicrotask', 'setImmediate', 'clearImmediate',
        'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
        'hrtime', 'performance',
      ],
    });
    update = jest.fn().mockResolvedValue(undefined);
    ExamSessions.findByPk.mockResolvedValue({
      id: 500,
      user_id: 101,
      exam_id: 70,
      class_id: 12,
      created_at: new Date('2026-11-07T09:00:00.000Z'),
      submitted_at: null,
      active: true,
      update,
    });
    calculateScore.mockImplementation(async () => {
      // Receipt time must precede asynchronous grading, not come from the client.
      jest.setSystemTime(new Date(receivedAt.getTime() + 5000));
      return { score: 85, correctCount: 17, total: 20 };
    });
    issueCredential.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test.each([
    ['normal online submission', '2026-11-10T11:59:30.000Z'],
    ['missing completed_at', undefined],
    ['impossible historical completed_at', '1900-01-01T00:00:00.000Z'],
    ['future completed_at', '2030-01-01T00:00:00.000Z'],
    ['delayed offline submission', '2026-11-08T10:00:00.000Z'],
    ['malformed completed_at', 'not-a-date'],
  ])('records server receipt time for %s and preserves the submission contract', async (_label, completedAt) => {
    const res = await request(app)
      .put('/exam-sessions/500/submit')
      .send({
        exam_id: 70,
        answers,
        ...(completedAt === undefined ? {} : { completed_at: completedAt }),
      });

    expect(res.statusCode).toBe(200);
    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith({
      answers,
      score: 85,
      submitted_at: receivedAt,
      active: false,
    });
    expect(calculateScore).toHaveBeenCalledWith([{
      question_id: 1,
      selected_option_ids: ['A'],
      updated_at: answers[0].updated_at,
    }], 70);
    expect(issueCredential).toHaveBeenCalledWith({ userId: 101, classId: 12 });
    expect(res.body).toEqual({
      message: 'Exam submitted successfully',
      score: '85.00',
      correct_answers: 17,
      total_questions: 20,
      resolved_session_id: 500,
    });
  });
});
