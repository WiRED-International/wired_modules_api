const express = require('express');
const router = express.Router();
const { ExamQuestions } = require('../../models');
const auth = require("../../../middleware/auth");

// GET /exams/:id/questions - Fetch all exam questions (without correct answers)
router.get('/exams/:id/questions', auth, async (req, res) => {
  const { id } = req.params;

  try {
    const questions = await ExamQuestions.findAll({
      where: { exam_id: id },
      attributes: ['id', 'question_text', 'options'], // Do not send correct_answer here
      order: [['id', 'ASC']]
    });

    res.json(questions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch exam questions' });
  }
});

module.exports = router;