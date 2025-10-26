const express = require('express');
const router = express.Router();
const { Exams, ExamSessions, ExamUserAccess, Users, ExamQuestions } = require('../../../models');
const auth = require("../../../middleware/auth");
const isAdmin = require('../../../middleware/isAdmin');

/**
 * 📋 GET /api/admin/exams
 * List all exams with basic info (for admin dashboard)
 */
router.get('/', auth, isAdmin, async (req, res) => {
  try {
    const exams = await Exams.findAll({
      attributes: ['id', 'title', 'available_from', 'available_until', 'duration_minutes'],
      order: [['available_from', 'DESC']],
    });
    res.json(exams);
  } catch (err) {
    console.error('❌ Failed to load exams:', err);
    res.status(500).json({ message: 'Failed to load exams' });
  }
});

/**
 * 🧩 POST /api/admin/exams
 * Create a new exam
 */
router.post('/', auth, isAdmin, async (req, res) => {
  try {
    const exam = await Exams.create(req.body);
    res.status(201).json(exam);
  } catch (err) {
    console.error('❌ Failed to create exam:', err);
    res.status(500).json({ message: 'Failed to create exam', error: err.message });
  }
});

/**
 * 🧾 POST /api/admin/exams/:id/assign
 * Assign specific users to an exam (creates ExamUserAccess records)
 */
router.post('/:id/assign', auth, isAdmin, async (req, res) => {
  const exam_id = req.params.id;
  const { user_ids, max_attempts } = req.body;

  if (!Array.isArray(user_ids) || user_ids.length === 0) {
    return res.status(400).json({ message: 'No user IDs provided.' });
  }

  try {
    const records = await Promise.all(
      user_ids.map(user_id =>
        ExamUserAccess.create({ exam_id, user_id, max_attempts })
      )
    );
    res.status(201).json({ message: 'Access granted successfully.', records });
  } catch (err) {
    console.error('❌ Failed to assign users:', err);
    res.status(500).json({ message: 'Failed to assign users', error: err.message });
  }
});

/**
 * 🔁 PUT /api/admin/exams/:examId/grant-attempt/:userId
 * Grant an additional attempt to a specific user
 */
router.put('/:examId/grant-attempt/:userId', auth, isAdmin, async (req, res) => {
  const { examId, userId } = req.params;
  const { reason } = req.body;

  try {
    const access = await ExamUserAccess.findOne({
      where: { exam_id: examId, user_id: userId },
    });

    if (!access)
      return res.status(404).json({ message: 'Access record not found.' });

    access.max_attempts = (access.max_attempts || 0) + 1;
    access.reason = reason || 'Extra attempt granted by admin';
    await access.save();

    res.json({
      message: 'Extra attempt granted successfully.',
      access,
    });
  } catch (err) {
    console.error('❌ Error granting attempt:', err);
    res.status(500).json({ message: 'Error granting attempt.', error: err.message });
  }
});

/**
 * 📊 GET /api/admin/exams/:examId/results
 * View all sessions for a specific exam (for admin review dashboard)
 */
router.get('/:examId/results', auth, isAdmin, async (req, res) => {
  const { examId } = req.params;

  try {
    const sessions = await ExamSessions.findAll({
      where: { exam_id: examId },
      include: [
        { model: Users, as: 'users', attributes: ['id', 'first_name', 'last_name', 'email'] },
      ],
      order: [['created_at', 'DESC']],
    });

    const results = sessions.map(s => ({
      session_id: s.id,
      user: {
        id: s.user.id,
        name: `${s.user.first_name} ${s.user.last_name}`,
        email: s.user.email,
      },
      attempt_number: s.attempt_number,
      score: s.score,
      submitted_at: s.submitted_at,
      active: s.active,
    }));

    res.json({ exam_id: examId, results });
  } catch (err) {
    console.error('❌ Failed to load exam results:', err);
    res.status(500).json({ message: 'Failed to load exam results' });
  }
});

/**
 * 🧐 GET /api/admin/exams/sessions/:sessionId/details
 * View detailed answers + grading info for a single exam session
 */
router.get('/sessions/:sessionId/details', auth, isAdmin, async (req, res) => {
  const { sessionId } = req.params;

  try {
    const session = await ExamSessions.findByPk(sessionId, {
      include: [
        { model: Users, as: 'users', attributes: ['id', 'first_name', 'last_name', 'email'] },
        { model: Exams, as: 'exams' },
      ],
    });

    if (!session)
      return res.status(404).json({ message: 'Exam session not found' });

    const questions = await ExamQuestions.findAll({
      where: { exam_id: session.exam_id },
      attributes: ['id', 'question_text', 'options', 'correct_answer'],
      order: [['id', 'ASC']],
    });

    const combined = questions.map(q => ({
      question_id: q.id,
      question_text: q.question_text,
      options: q.options,
      correct_answer: q.correct_answer,
      user_answer: session.answers?.[q.id] ?? null,
    }));

    res.json({
      user: session.user,
      exam: session.exam,
      score: session.score,
      submitted_at: session.submitted_at,
      questions: combined,
    });
  } catch (err) {
    console.error('❌ Failed to load exam session details:', err);
    res.status(500).json({ message: 'Failed to load exam session details' });
  }
});

module.exports = router;