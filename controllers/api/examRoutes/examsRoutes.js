const express = require('express');
const router = express.Router();
const {
  Exams,
  ExamQuestions,
  ExamSessions,
  ExamUserAccess,
  ExamTemplateQuestions
} = require('../../../models');
const auth = require("../../../middleware/auth");
const { Op } = require('sequelize');
const { shuffleExamQuestions } = require("../../../utils/examUtils")

// GET /exams/available
router.get('/available', auth, async (req, res) => {
  try {
    // Always compare in UTC
    const now = new Date();
    console.log("🕒 Current server UTC time:", now.toISOString());

    const exam = await Exams.findOne({
      where: {
        available_from: { [Op.lte]: now },
        available_until: { [Op.gte]: now },
      },
      order: [['available_from', 'ASC']],
    });

    if (!exam) {
      console.log("⚠️ No active exam found for current time window.");
      return res.status(404).json({ message: 'No active exam available' });
    }

    console.log("✅ Found active exam:", exam.title);

    return res.status(200).json({
      id: exam.id,
      title: exam.title,
      available_from: exam.available_from,
      available_until: exam.available_until,
      duration_minutes: exam.duration_minutes,
    });
  } catch (err) {
    console.error("❌ Error fetching available exam:", err);
    res.status(500).json({ message: 'Failed to check available exams' });
  }
});

// 👤 GET /exams/assigned (list all exams assigned to the current user)
router.get('/assigned', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const assigned = await ExamUserAccess.findOne({
      where: { user_id: userId },
      include: [
        {
          model: Exams,
          as: 'exams',
          attributes: [
            'id',
            'title',
            'description',
            'available_from',
            'available_until',
            'duration_minutes'
          ],
        }
      ],
      order: [['created_at', 'DESC']]
    });

    if (!assigned || !assigned.exams) {
      return res.json([]); // No exam assigned
    }

    const exam = assigned.exams;

    // Use Luxon for safe UTC handling
    const { DateTime } = require("luxon");
    const nowUTC = DateTime.now().toUTC();
    const startUTC = DateTime.fromJSDate(exam.available_from).toUTC();
    const endUTC = DateTime.fromJSDate(exam.available_until).toUTC();

    // 🚫 Exam not open yet
    if (nowUTC < startUTC) {
      return res.json({
        message: "Exam not yet open.",
        exam_opens_at: startUTC.toISO(),
        exam_closes_at: endUTC.toISO()
      });
    }

    // 🚫 Exam closed
    if (nowUTC > endUTC) {
      return res.json({
        message: "Exam is closed.",
        exam_closed_at: endUTC.toISO()
      });
    }

    // 🟢 Exam is currently open — send full info to Flutter
    return res.json([
      {
        exam_id: exam.id,
        title: exam.title,
        description: exam.description,
        duration_minutes: exam.duration_minutes,
        available_from: startUTC.toISO(),   // send UTC ISO
        available_until: endUTC.toISO()
      }
    ]);

  } catch (err) {
    console.error("❌ Error fetching assigned exam:", err);
    res.status(500).json({ message: "Failed to fetch assigned exam" });
  }
});

// GET /exams/:id - Get exam metadata
router.get('/:id', auth, async (req, res) => {
  try {
    const exam = await Exams.findByPk(req.params.id);

    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    res.json(exam);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch exam' });
  }
});

// GET /exams/:id/questions - Get all questions
router.get('/:id/questions', auth, async (req, res) => {

  try {

    const exam = await Exams.findByPk(req.params.id);

    if (!exam) {
      return res.status(404).json({
        message: 'Exam not found'
      });
    }

    let questions = [];

    // ✅ NEW TEMPLATE-BASED EXAMS
    if (exam.exam_template_id) {

      questions = await ExamTemplateQuestions.findAll({
        where: {
          exam_template_id: exam.exam_template_id
        },
        attributes: ['id', 'question_text', 'options'],
        order: [['order', 'ASC']]
      });

    }

    // ✅ LEGACY EXAMS
    else {

      questions = await ExamQuestions.findAll({
        where: { exam_id: req.params.id },
        attributes: ['id', 'question_text', 'options'],
        order: [['order', 'ASC']]
      });

    }

    res.json(questions);

  } catch (err) {

    console.error(err);

    res.status(500).json({
      message: 'Failed to fetch questions'
    });
  }
});


// POST /exams/:id/start-session
router.post('/:id/start-session', auth, async (req, res) => {
  const exam_id = parseInt(req.params.id);
  const user_id = req.user.id;

  try {
    // ✅ Include correct field name (correct_answers instead of correct_answer)
    const exam = await Exams.findByPk(exam_id);

    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    let examQuestions = [];

    // TEMPLATE-BASED EXAM
    if (exam.exam_template_id) {

      examQuestions = await ExamTemplateQuestions.findAll({
        where: {
          exam_template_id: exam.exam_template_id
        },
        attributes: [
          'id',
          'question_type',
          'question_text',
          'options',
          'correct_answers'
        ],
        order: [['order', 'ASC']]
      });

    }

    // ✅ LEGACY EXAM
    else {

      examQuestions = await ExamQuestions.findAll({
        where: {
          exam_id
        },
        attributes: [
          'id',
          'question_type',
          'question_text',
          'options',
          'correct_answers'
        ],
        order: [['id', 'ASC']]
      });

    }

    if (!examQuestions.length) {
      return res.status(404).json({
        message: 'No questions found for this exam'
      });
    }

    // Shuffle questions and their options
    const { shuffledQuestions, questionOrder } = shuffleExamQuestions(examQuestions, true);

    const now = new Date();
    if (now < exam.available_from || now > exam.available_until) {
      return res.status(403).json({ message: 'Exam not currently available' });
    }

    // 🔍 Check access permissions
    const access = await ExamUserAccess.findOne({
      where: { exam_id, user_id },
    });
    if (!access) {
      return res.status(403).json({ message: 'Access not granted for this exam' });
    }

    // 🔍 Check for existing active (unfinished) session
    const activeSession = await ExamSessions.findOne({
      where: {
        exam_id,
        user_id,
        active: true,
        submitted_at: null,
      },
    });

    if (activeSession) {
      return res.status(403).json({
        message: 'You already have an active exam session. Please finish or submit it before starting a new one.',
        session_id: activeSession.id,
      });
    }

    // 🔍 Count past attempts
    const attemptCount = await ExamSessions.count({ where: { user_id, exam_id } });

    // Enforce max attempts
    if (access.max_attempts !== null && attemptCount >= access.max_attempts) {
      return res.status(403).json({
        message: `Maximum attempts (${access.max_attempts}) reached for this exam.`,
      });
    }

    // ✅ Create new session
    const session = await ExamSessions.create({
      user_id,
      exam_id,
      attempt_number: attemptCount + 1,
      created_at: now,
      active: true,
      shuffle_order: JSON.stringify(questionOrder),
    });

    console.log(
      "🧩 Sending questions to client:",
      examQuestions.map(q => ({
        id: q.id,
        type: q.question_type
      }))
    );

    res.status(201).json({
      session_id: session.id,
      exam: {
        id: exam.id,
        title: exam.title,
        available_from: exam.available_from,
        available_until: exam.available_until,
        duration_minutes: exam.duration_minutes
      },
      questions: shuffledQuestions,
    });
  } catch (err) {
    console.error('❌ Error starting exam session:', err);
    return res.status(500).json({ message: 'Failed to start exam session', error: err.message });
  }
});

module.exports = router;