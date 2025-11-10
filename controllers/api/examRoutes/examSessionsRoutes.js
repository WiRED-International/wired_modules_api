const express = require('express');
const router = require("express").Router();
const { Users, Exams, ExamSessions, ExamQuestions } = require('../../../models');
const auth = require("../../../middleware/auth");
const isAdmin = require("../../../middleware/isAdmin");
const { calculateScore } = require("../../../utils/examUtils");

// This route allows the user to submit their answers.
router.put('/:id/submit', auth, async (req, res) => {
  const { id } = req.params;
  const { answers, exam_id } = req.body;
  const user_id = req.user.id;

  console.log('\nParam id:', id);
  console.log('Sequelize table name:', ExamSessions.getTableName());
  console.log('--- SUBMIT DEBUG ---');
  console.log('Authenticated user_id:', user_id);
  console.log('--------------------');

  let session; 

  try {
    // 1️⃣ Find the session
    session = await ExamSessions.findByPk(id);

    // 2️⃣ Handle missing session (offline submission or reseeded DB)
    if (!session) {
      console.warn(`⚠️ No session found for ID ${id}`);

      if (process.env.NODE_ENV !== 'production' && exam_id) {
        console.log('🧩 Dev mode: attempting to create fallback session…');
        try {
          // try to create with the same primary key
          session = await ExamSessions.create({
            id: Number(id),      // may be allowed by your DB; if not, the catch below will handle it
            exam_id: exam_id,
            user_id,
            attempt_number: 1,
            created_at: new Date(),
            submitted_at: null,
            answers: [],
            score: null,
            active: true,
          });
          console.log('✅ Created fallback session with ID:', session.id);
        } catch (e) {
          console.warn('↪️ Could not create fallback with same ID, creating a new one instead:', e.message);
          session = await ExamSessions.create({
            exam_id: exam_id,
            user_id,
            attempt_number: 1,
            created_at: new Date(),
            submitted_at: null,
            answers: [],
            score: null,
            active: true,
          });
          console.log('✅ Created fallback session with NEW ID:', session.id,
                      '(client sent', id, 'but DB now uses', session.id, ')');
        }
      }
    }

    console.log('Session found:', session ? 'yes' : 'no');
    console.log('Session.id:', session?.id);
    console.log('Session.user_id:', session?.user_id);

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // 3️⃣ Ensure session belongs to the authenticated user
    if (session.user_id !== user_id) {
      return res.status(403).json({ message: 'Access denied — session does not belong to user' });
    }

    // 4️⃣ Prevent double submissions
    if (session.submitted_at) {
      return res.status(400).json({ message: 'Exam already submitted' });
    }

    // 5️⃣ Ensure answers exist
    if (!Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ message: 'Answers missing or invalid format' });
    }

    // ✅ 6️⃣ Normalize answers for both single and multiple formats
    console.log('🧾 Raw answers from client:', JSON.stringify(answers, null, 2));

    const normalizedAnswers = answers.map((a) => {
      const selected = Array.isArray(a.selected_option_ids)
        ? a.selected_option_ids
        : Array.isArray(a.selected_options)
        ? a.selected_options
        : a.selected_option
        ? [a.selected_option]
        : a.selected_option_id
        ? [a.selected_option_id]
        : [];

      return {
        question_id: a.question_id,
        selected_option_ids: selected, // unified format for backend grading
        updated_at: a.updated_at || new Date().toISOString(),
      };
    });

    console.log('🧠 Normalized answers:', JSON.stringify(normalizedAnswers, null, 2));

    // ✅ 7️⃣ Calculate score with normalized answers
    const { score, correctCount, total } = await calculateScore(normalizedAnswers, session.exam_id);

    // 7️⃣ Update the session
    await session.update({
      answers,
      score,
      submitted_at: new Date(),
      active: false,
    });

    console.log(`✅ Exam session ${session.id} submitted successfully.`);

    // 8️⃣ Return success response
    res.status(200).json({
      message: 'Exam submitted successfully',
      score: Number.isFinite(score) ? score.toFixed(2) : '0.00',
      correct_answers: correctCount,
      total_questions: total,
      resolved_session_id: session.id,
    });

  } catch (err) {
    console.error('❌ Error submitting exam:', err);
    res.status(500).json({ message: 'Error submitting exam', error: err.message });
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
      attributes: ['id', 'question_text', 'options', 'correct_answers'],
      order: [['id', 'ASC']]
    });

    const combined = questions.map((q) => ({
      question_id: q.id,
      question_text: q.question_text,
      options: q.options,
      correct_answers: q.correct_answers,
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
