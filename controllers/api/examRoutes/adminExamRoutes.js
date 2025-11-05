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

// 🧠 Add questions to an existing exam
router.post('/:examId/questions', auth, isAdmin, async (req, res) => {
  const { examId } = req.params;
  const { questions } = req.body;

  if (!Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ message: 'Questions array is required.' });
  }

  try {
    const created = await Promise.all(
      questions.map(q =>
        ExamQuestions.create({
          exam_id: examId,
          question_text: q.question_text,
          options: q.options,
          correct_answer: q.correct_answer,
        })
      )
    );

    res.status(201).json({ message: 'Questions added successfully.', created });
  } catch (err) {
    console.error('❌ Failed to add questions:', err);
    res.status(500).json({ message: 'Failed to add questions', error: err.message });
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
router.post('/:examId/assign', auth, isAdmin, async (req, res) => {
  const { examId } = req.params;
  const { user_ids, max_attempts } = req.body;

  // 🔹 Basic validation
  if (!Array.isArray(user_ids) || user_ids.length === 0) {
    return res.status(400).json({ message: 'No user IDs provided.' });
  }

  try {
    // ✅ Verify that the exam exists (optional but good practice)
    const exam = await Exams.findByPk(examId);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found.' });
    }

    // ✅ Create ExamUserAccess entries
    const records = await Promise.all(
      user_ids.map(async (user_id) => {
        return ExamUserAccess.create({
          exam_id: examId,
          user_id,
          max_attempts: max_attempts ?? 1,  // default to 1 attempt
          granted_by: req.user.id,          // record which admin granted access
        });
      })
    );

    res.status(201).json({
      message: `Access granted successfully to ${records.length} user(s).`,
      records,
    });
  } catch (err) {
    console.error('❌ Failed to assign users:', err);
    res.status(500).json({
      message: 'Failed to assign users',
      error: err.message,
    });
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

// 📋 View all users with access to an exam
router.get('/:examId/access', auth, isAdmin, async (req, res) => {
  const { examId } = req.params;
  try {
    const accessList = await ExamUserAccess.findAll({
      where: { exam_id: examId },
      include: [
        { model: Users, as: 'users', attributes: ['id', 'first_name', 'last_name', 'email', 'role_id'] },
        { model: Exams, as: 'exams', attributes: ['id', 'title', 'available_from', 'available_until'] },
        { model: Users, as: 'granted_by_user', attributes: ['id', 'first_name', 'last_name', 'email'] }
      ],
      order: [['created_at', 'DESC']],
    });

    res.json(accessList);
  } catch (err) {
    console.error('❌ Error fetching exam access list:', err);
    res.status(500).json({ message: 'Failed to fetch access list' });
  }
});

// 👤 View all exams assigned to a specific user
router.get('/users/:userId/exams', auth, isAdmin, async (req, res) => {
  const { userId } = req.params;
  try {
    const accessibleExams = await ExamUserAccess.findAll({
      where: { user_id: userId },
      include: [
        { model: Exams, as: 'exams', attributes: ['id', 'title', 'available_from', 'available_until'] }
      ],
      order: [['created_at', 'DESC']],
    });

    res.json(accessibleExams);
  } catch (err) {
    console.error('❌ Error fetching user exam list:', err);
    res.status(500).json({ message: 'Failed to fetch user exam list' });
  }
});

// 📊 Summary: count how many users have access per exam
router.get('/summary', auth, isAdmin, async (req, res) => {
  try {
    const examSummary = await ExamUserAccess.findAll({
      attributes: [
        'exam_id',
        [ExamUserAccess.sequelize.fn('COUNT', ExamUserAccess.sequelize.col('user_id')), 'total_students']
      ],
      include: [
        { model: Exams, as: 'exams', attributes: ['id', 'title'] }
      ],
      group: ['exam_id', 'exams.id']
    });

    res.json(examSummary);
  } catch (err) {
    console.error('❌ Error fetching exam summary:', err);
    res.status(500).json({ message: 'Failed to fetch exam summary' });
  }
});


module.exports = router;