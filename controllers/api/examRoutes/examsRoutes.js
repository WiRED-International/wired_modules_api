const express = require('express');
const router = express.Router();
const {
  Exams,
  ExamQuestions,
  ExamSessions,
  ExamUserAccess,
  ExamTemplateQuestions,
  ClassEnrollments
} = require('../../../models');
const auth = require("../../../middleware/auth");
const ROLES = require("../../../utils/roles");
const { Op } = require('sequelize');
const { shuffleExamQuestions } = require("../../../utils/examUtils");
const {
  syncEnrolledClassesExamAccessForUser,
} = require("../../../services/exams/syncClassExamAccess");

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

    // Backfill ExamUserAccess for any exams assigned to the user's enrolled classes
    await syncEnrolledClassesExamAccessForUser(userId);

    const assignedList = await ExamUserAccess.findAll({
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

    if (!Array.isArray(assignedList) || assignedList.length === 0) {
      return res.json([]); // No exam assigned
    }

    // Use Luxon for safe UTC handling
    const { DateTime } = require("luxon");
    const nowUTC = DateTime.now().toUTC();

    const openExams = [];
    const upcomingExams = [];

    for (const assigned of assignedList) {
      const exam = assigned?.exams;
      if (!exam) continue;

      const startUTC = DateTime.fromJSDate(new Date(exam.available_from)).toUTC();
      const endUTC = DateTime.fromJSDate(new Date(exam.available_until)).toUTC();

      if (!startUTC.isValid || !endUTC.isValid || nowUTC > endUTC) {
        continue;
      }

      const item = {
        exam_id: exam.id,
        title: exam.title,
        description: exam.description,
        duration_minutes: exam.duration_minutes,
        available_from: startUTC.toISO(),
        available_until: endUTC.toISO(),
        status: nowUTC >= startUTC ? 'open' : 'upcoming',
      };

      if (nowUTC >= startUTC) {
        openExams.push(item);
      } else {
        upcomingExams.push(item);
      }
    }

    upcomingExams.sort(
      (a, b) => new Date(a.available_from).getTime() - new Date(b.available_from).getTime()
    );

    return res.json([...openExams, ...upcomingExams]);

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
    const examId = Number(req.params.id);
    const userId = req.user.id;
    const userRole = Number(req.user.roleId ?? req.user.role_id);

    const exam = await Exams.findByPk(examId);

    if (!exam) {
      return res.status(404).json({
        message: 'Exam not found'
      });
    }

    const isAdminOrSuperAdmin =
      userRole === ROLES.ADMIN || userRole === ROLES.SUPER_ADMIN;

    if (!isAdminOrSuperAdmin) {
      await syncEnrolledClassesExamAccessForUser(userId);

      const now = new Date();
      if (now < new Date(exam.available_from) || now > new Date(exam.available_until)) {
        return res.status(403).json({
          message: 'Exam not currently available'
        });
      }

      const access = await ExamUserAccess.findOne({
        where: {
          exam_id: examId,
          user_id: userId,
        },
      });

      if (!access) {
        return res.status(403).json({
          message: 'Access not granted for this exam'
        });
      }
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

    // Backfill ExamUserAccess for any exams assigned to the user's enrolled classes
    await syncEnrolledClassesExamAccessForUser(user_id);

    // 🔍 Check access permissions
    const access = await ExamUserAccess.findOne({
      where: { exam_id, user_id },
    });
    if (!access) {
      return res.status(403).json({ message: 'Access not granted for this exam' });
    }

    // 🔍 Resolve the class for this exam attempt
    const assignedClasses = await exam.getClasses({
      attributes: [
        'id',
        'program_id',
        'organization_id'
      ],
      joinTableAttributes: [],
    });

    let class_id = null;

    if (assignedClasses.length > 0) {

      const assignedClassIds =
        assignedClasses.map(classItem => classItem.id);

      const enrollments = await ClassEnrollments.findAll({
        where: {
          user_id,
          class_id: {
            [Op.in]: assignedClassIds,
          },
          status: 'enrolled',
        },
        attributes: ['class_id'],
      });

      if (enrollments.length === 0) {
        return res.status(403).json({
          message:
            'You are not enrolled in a class assigned to this exam',
        });
      }

      if (enrollments.length > 1) {
        return res.status(409).json({
          message:
            'This exam is assigned to more than one of your classes. The exam class could not be determined.',
        });
      }

      class_id = enrollments[0].class_id;
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
      class_id,
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