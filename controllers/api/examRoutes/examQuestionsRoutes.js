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

    const formattedQuestions = questions.map((q, index) => {
      let correctAnswers = [];

      if (Array.isArray(q.correct_answers)) {
        correctAnswers = q.correct_answers;
      } else if (Array.isArray(q.correct_answer)) {
        correctAnswers = q.correct_answer;
      } else if (typeof q.correct_answers === 'string') {
        try {
          correctAnswers = JSON.parse(q.correct_answers);
        } catch {
          correctAnswers = [];
        }
      }

      return {
        exam_id: Number(id),
        question_type: q.question_type || 'single',
        question_text: q.question_text?.trim(),
        options: q.options || {},
        correct_answers: correctAnswers,  // ✅ store JSON array
        order: q.order ?? index + 1,
        created_at: new Date(),
        updated_at: new Date(),
      };
    });

    // 🧩 Debugging output
    console.log('\n🧪 [DEBUG] First formatted question:');
    console.dir(formattedQuestions[0], { depth: null });

    // Validate fields
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

    // 🧮 Bulk insert
    const created = await ExamQuestions.bulkCreate(formattedQuestions);
    console.log(`✅ [DEBUG] Created ${created.length} questions`);

    // Fetch one back to confirm what got stored
    const check = await ExamQuestions.findOne({ where: { exam_id: id } });
    console.log('🧩 [DEBUG] DB stored sample:', check?.toJSON());

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