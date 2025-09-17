const express = require('express');
const router = require("express").Router();
const { Users, Exams, ExamSessions, ExamQuestions } = require('../../../models');
const auth = require("../../../middleware/auth");
const isAdmin = require("../../../middleware/isAdmin");

// Helper: Simple grading logic (can be extended)
const calculateScore = async (userAnswers, examId) => {
  const questions = await ExamQuestions.findAll({
    where: { exam_id: examId },
    attributes: ['id', 'correct_answer']
  });

  let correctCount = 0;

  questions.forEach((q) => {
    const userAnswer = userAnswers[q.id];
    if (userAnswer && userAnswer === q.correct_answer) {
      correctCount++;
    }
  });

  const total = questions.length;
  return (correctCount / total) * 100;
};

// POST /api/exams/:id/start-session
router.post('/exams/:id/start-session', auth, async (req, res) => {
  const exam_id = parseInt(req.params.id);
  const user_id = req.user.id;

  try {
    const exam = await Exams.findByPk(exam_id);
    if (!exam) return res.status(404).json({ message: 'Exam not found' });

    const now = new Date();
    if (now < exam.available_from || now > exam.available_until) {
      return res.status(403).json({ message: 'Exam not currently available' });
    }

    // Check for past attempts
    const attemptCount = await ExamSessions.count({ where: { user_id, exam_id } });

    // Create new session
    const session = await ExamSessions.create({
      user_id,
      exam_id,
      attempt_number: attemptCount + 1,
      created_at: now
    });

    // Fetch questions (without correct_answer)
    const questions = await ExamQuestions.findAll({
      where: { exam_id },
      attributes: ['id', 'question_text', 'options'],
      order: [['id', 'ASC']]
    });

    res.status(201).json({
      session_id: session.id,
      exam: {
        id: exam.id,
        title: exam.title,
        available_from: exam.available_from,
        available_until: exam.available_until,
        duration_minutes: exam.duration_minutes
      },
      questions
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to start exam session' });
  }
});

// PUT /api/exam-sessions/:id/submit
router.put('/exam-sessions/:id/submit', auth, async (req, res) => {
  const { id } = req.params;
  const { answers } = req.body;
  const user_id = req.user.id;

  try {
    const session = await ExamSessions.findByPk(id);
    if (!session || session.user_id !== user_id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (session.submitted_at) {
      return res.status(400).json({ message: 'Exam already submitted' });
    }

    const score = await calculateScore(answers, session.exam_id);

    await session.update({
      answers,
      score,
      submitted_at: new Date()
    });

    res.status(200).json({
      message: 'Exam submitted',
      score: score.toFixed(2)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error submitting exam' });
  }
});

// Admin view of a user's submitted exam
router.get('/exam-sessions/:id/details', auth, isAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const session = await ExamSessions.findByPk(id, {
      include: [
        { model: Users, as: 'users', attributes: ['id', 'first_name', 'last_name', 'email'] },
        { model: Exams, as: 'exams', attributes: ['id', 'title'] }
      ]
    });

    if (!session) {
      return res.status(404).json({ message: 'Exam session not found' });
    }

    const questions = await ExamQuestions.findAll({
      where: { exam_id: session.exam_id },
      attributes: ['id', 'question_text', 'options', 'correct_answer'],
      order: [['id', 'ASC']]
    });

    const combined = questions.map((q) => ({
      question_id: q.id,
      question_text: q.question_text,
      options: q.options,
      correct_answer: q.correct_answer,
      user_answer: session.answers?.[q.id] || null
    }));

    res.json({
      user: session.user,
      exam: session.exam,
      score: session.score,
      submitted_at: session.submitted_at,
      questions: combined
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load exam session details' });
  }
});

router.get('/exam-sessions/exam/:examId/results', auth, isAdmin, async (req, res) => {
  const { examId } = req.params;

  try {
    const sessions = await ExamSessions.findAll({
      where: { exam_id: examId },
      include: [
        {
          model: Users,
          as: 'user',
          attributes: ['id', 'first_name', 'last_name', 'email']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    const results = sessions.map((session) => ({
      session_id: session.id,
      user: {
        id: session.user.id,
        name: `${session.user.first_name} ${session.user.last_name}`,
        email: session.user.email
      },
      attempt_number: session.attempt_number,
      score: session.score,
      submitted_at: session.submitted_at
    }));

    res.json({ exam_id: examId, results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load exam results' });
  }
});

module.exports = router;
