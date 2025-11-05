const express = require('express');
const router = express.Router();
const { ExamQuestions } = require('../../models');
const auth = require("../../../middleware/auth");

// GET /exams/:id/questions - Fetch all exam questions (without correct answers)
router.post('/exams/:id/questions', auth, async (req, res) => {
  const { id } = req.params;
  const { questions } = req.body;

  try {
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: 'Questions array is required' });
    }

    // 🧩 Normalize data so Sequelize never gets null fields
    const formattedQuestions = questions.map(q => ({
      exam_id: id,
      question_type: q.question_type || 'single',
      question_text: q.question_text,
      options: q.options,
      correct_answers: q.correct_answers || q.correct_answer || [], // ✅ handle both names
      order: q.order || null,
    }));

    // 🧠 Validate fields before insert
    for (const fq of formattedQuestions) {
      if (!fq.question_text || !fq.options) {
        return res.status(400).json({ message: 'Each question must include question_text and options' });
      }
    }

    // 🧮 Bulk insert all questions at once
    const created = await ExamQuestions.bulkCreate(formattedQuestions);

    res.status(201).json({
      message: 'Questions added successfully',
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