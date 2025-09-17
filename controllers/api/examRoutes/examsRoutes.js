const express = require('express');
const router = express.Router();
const { Exams, ExamQuestions } = require('../../../models');
const auth = require("../../../middleware/auth");


// GET /api/exams/:id - Get exam metadata
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

// GET /api/exams/:id/questions - Get all questions
router.get('/:id/questions', auth, async (req, res) => {
  try {
    const questions = await ExamQuestions.findAll({
      where: { exam_id: req.params.id },
      attributes: ['id', 'question_text', 'options'] // Don't expose correct_answer
    });

    res.json(questions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch questions' });
  }
});

module.exports = router;