const express = require('express');
const router = express.Router();
const { Exams, ExamSessions, ExamUserAccess, Users, ExamQuestions } = require('../../../models');
const auth = require("../../../middleware/auth");
const isAdmin = require('../../../middleware/isAdmin');
const { localToUtcISO, DEFAULT_EXAM_TIME_ZONE } = require("../../../utils/timezoneUtils");

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

// 🧠 Add questions to an existing exam (the :id is exam id)
router.post('/:id/questions', auth, isAdmin, async (req, res) => {
  const { id } = req.params;
  const { questions } = req.body;

  try {
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: 'Questions array is required' });
    }

    // 🧩 Normalize & validate data for each question
    console.log('🧭 Route params:', req.params);
    const formattedQuestions = questions.map((q, index) => {
      // Ensure correct_answers is always an array
      let correctAnswers = [];
      if (Array.isArray(q.correct_answers)) {
        correctAnswers = q.correct_answers;
      } else if (Array.isArray(q.correct_answer)) {
        correctAnswers = q.correct_answer;
      } else if (typeof q.correct_answers === 'string') {
        // handle accidentally stringified JSON
        try {
          correctAnswers = JSON.parse(q.correct_answers);
        } catch {
          correctAnswers = [];
        }
      }

      return {
        exam_id: id,
        question_type: q.question_type || 'single',
        question_text: q.question_text?.trim(),
        options: q.options || {},
        correct_answers: correctAnswers, // ✅ always stored as array
        order: q.order ?? index + 1, // fallback order if missing
        created_at: new Date(),
        updated_at: new Date(),
      };
    });

    // 🧠 Validate required fields
    for (const fq of formattedQuestions) {
      if (!fq.question_text || !Object.keys(fq.options).length) {
        return res.status(400).json({
          message: 'Each question must include both question_text and at least one option',
        });
      }
      if (!Array.isArray(fq.correct_answers)) {
        return res.status(400).json({
          message: 'correct_answers must be an array',
        });
      }
    }

    // 🧮 Bulk insert all questions at once
    console.log('🧪 First formatted question:', formattedQuestions[0]);
    const created = await ExamQuestions.bulkCreate(formattedQuestions);

    res.status(201).json({
      message: '✅ Questions added successfully',
      count: created.length,
    });
  } catch (error) {
    console.error('❌ Failed to add questions:', error);
    res.status(500).json({
      message: 'Failed to add questions',
      error: error.message,
    });
  }
});

// 🔁 PUT /admin/exams/:id/questions
// Updates existing questions (with `id`) and adds new ones (without `id`)
router.put('/:id/questions', auth, isAdmin, async (req, res) => {
  const { id } = req.params; // exam_id
  const { questions } = req.body;

  try {
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: 'Questions array is required' });
    }

    const updates = [];
    const newQuestions = [];

    for (const [index, q] of questions.entries()) {
      // Normalize correct_answers input
      let correctAnswers = [];
      if (Array.isArray(q.correct_answers)) {
        correctAnswers = q.correct_answers;
      } else if (typeof q.correct_answers === 'string') {
        try {
          correctAnswers = JSON.parse(q.correct_answers);
        } catch {
          correctAnswers = [];
        }
      }

      // ✅ Case 1: Update existing (has ID)
      if (q.id) {
        const question = await ExamQuestions.findOne({
          where: { id: q.id, exam_id: id },
        });

        if (!question) {
          console.warn(`⚠️ Question ID ${q.id} not found for exam ${id}, skipping update.`);
          continue;
        }

        await question.update({
          question_type: q.question_type ?? question.question_type,
          question_text: q.question_text?.trim() ?? question.question_text,
          options: q.options ?? question.options,
          correct_answers:
            correctAnswers.length > 0 ? correctAnswers : question.correct_answers,
          order: q.order ?? question.order,
          updated_at: new Date(),
        });

        updates.push(question);
      }

      // ✅ Case 2: Add new (no ID)
      else {
        if (!q.question_text || !q.options) {
          console.warn(`⚠️ Skipping question at index ${index}: missing question_text or options.`);
          continue;
        }

        const newQ = {
          exam_id: Number(id),
          question_type: q.question_type || 'single',
          question_text: q.question_text.trim(),
          options: q.options,
          correct_answers: correctAnswers,
          order: q.order ?? index + 1,
          created_at: new Date(),
          updated_at: new Date(),
        };
        newQuestions.push(newQ);
      }
    }

    // 🧮 Bulk insert new questions if any
    let created = [];
    if (newQuestions.length > 0) {
      created = await ExamQuestions.bulkCreate(newQuestions);
      console.log(`🆕 Added ${created.length} new questions`);
    }

    res.status(200).json({
      message: `✅ Successfully updated ${updates.length} and added ${created.length} question(s).`,
      updatedCount: updates.length,
      addedCount: created.length,
    });
  } catch (error) {
    console.error('❌ Failed to update/add questions:', error);
    res.status(500).json({
      message: 'Failed to update/add exam questions',
      error: error.message,
    });
  }
});

// 📋 GET /admin/exams/:id/questions - Fetch all questions for a given exam
router.get('/:id/questions', auth, isAdmin, async (req, res) => {
  const { id } = req.params;
  const includeAnswers = req.query.includeAnswers === 'true';
  const userRole = req.user?.roleId;

  try {
    const canViewAnswers = includeAnswers && (userRole === 2 || userRole === 3); 
    // Assuming roleId 2=Admin, 3=Super Admin

    const questions = await ExamQuestions.findAll({
      where: { exam_id: id },
      order: [['order', 'ASC']],
      attributes: canViewAnswers
        ? undefined
        : { exclude: ['correct_answers'] },
    });

    if (!questions || questions.length === 0) {
      return res.status(404).json({ message: `No questions found for exam ID ${id}` });
    }

    res.status(200).json({
      message: `✅ Retrieved ${questions.length} question(s) for exam ${id}`,
      count: questions.length,
      includeAnswers: canViewAnswers,
      questions,
    });
  } catch (error) {
    console.error('❌ Failed to fetch questions:', error);
    res.status(500).json({
      message: 'Failed to fetch exam questions',
      error: error.message,
    });
  }
});

/**
 * 🧩 POST /api/admin/exams
 * Create a new exam
 */
router.post('/', auth, isAdmin, async (req, res) => {
  try {
    const {
      title,
      description,
      localStart,
      localEnd,
      timeZone,
      duration_minutes
    } = req.body;

    if (!localStart || !localEnd) {
      return res.status(400).json({
        message: "localStart and localEnd are required (local date/time)"
      });
    }

    // Use provided timezone or default
    const zone = timeZone || DEFAULT_EXAM_TIME_ZONE;

    // Convert local times to UTC ISO
    const startUTC = localToUtcISO(localStart, zone);
    const endUTC = localToUtcISO(localEnd, zone);

    const exam = await Exams.create({
      title,
      description,
      available_from: startUTC,
      available_until: endUTC,
      duration_minutes
    });

    res.status(201).json({
      message: "Exam created successfully (UTC normalized).",
      savedUTC: {
        available_from: startUTC,
        available_until: endUTC
      },
      exam
    });

  } catch (err) {
    console.error('❌ Failed to create exam:', err);
    res.status(500).json({
      message: 'Failed to create exam',
      error: err.message
    });
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