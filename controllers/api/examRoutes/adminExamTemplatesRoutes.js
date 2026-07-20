const router = require('express').Router();

const auth = require("../../../middleware/auth");
const isAdmin = require('../../../middleware/isAdmin');
const isSuperAdmin = require("../../../middleware/isSuperAdmin");

const {
  ExamTemplates,
  ExamTemplateQuestions,
  Exams,
  ExamSessions
} = require('../../../models');

// =====================================================
// TEMPLATE ROUTES
// =====================================================

router.get('/templates', auth, isSuperAdmin, async (req, res) => {
  try {

    const templates = await ExamTemplates.findAll({
      order: [['created_at', 'DESC']]
    });

    res.json(templates);

  } catch (error) {

    console.error('❌ Failed to load templates:', error);

    res.status(500).json({
      message: 'Failed to load templates',
      error: error.message
    });
  }
});

router.post('/templates', auth, isSuperAdmin, async (req, res) => {

  const {
    title,
    description
  } = req.body;

  try {

    const template = await ExamTemplates.create({
      title,
      description
    });

    res.status(201).json({
      message: '✅ Template created successfully',
      template
    });

  } catch (error) {

    console.error('❌ Failed to create template:', error);

    res.status(500).json({
      message: 'Failed to create template',
      error: error.message
    });
  }
});

router.get('/templates/:templateId', auth, isSuperAdmin, async (req, res) => {

  const { templateId } = req.params;

  try {

    const template = await ExamTemplates.findByPk(templateId, {
      include: [
        {
          model: ExamTemplateQuestions,
          as: 'exam_template_questions',
        }
      ],
      order: [
        [{ model: ExamTemplateQuestions, as: 'exam_template_questions' }, 'order', 'ASC']
      ]
    });

    if (!template) {
      return res.status(404).json({
        message: 'Template not found'
      });
    }

    const exams = await Exams.findAll({
      where: {
        exam_template_id: template.id,
      },
      attributes: ['id'],
    });

    const examIds = exams.map(exam => exam.id);

    const sessions = await ExamSessions.findAll({
      where: {
        exam_id: examIds,
        active: false, // completed exams
      },
    });

    const questionStats = {};

    template.exam_template_questions.forEach(question => {
      questionStats[question.id] = {
        attempts: 0,
        correct: 0,
      };
    });

      for (const session of sessions) {

        const answerMap = {};

        (session.answers || []).forEach(answer => {
          answerMap[answer.question_id] = answer;
        });
        for (const question of template.exam_template_questions) {

        const userAnswer = answerMap[question.id];

        if (!userAnswer) {
          continue;
        }

        const selected = userAnswer.selected_option_ids || [];
        const correct = question.correct_answers || [];

        const isCorrect =
          selected.length === correct.length &&
          selected.every(id => correct.includes(id));

        questionStats[question.id].attempts++;

        if (isCorrect) {
          questionStats[question.id].correct++;
        }

      }
    }
    
    template.exam_template_questions.forEach(question => {

      const stats = questionStats[question.id];

      const attempts = stats.attempts;

      const correctRate =
        attempts > 0
          ? Number(((stats.correct / attempts) * 100).toFixed(1))
          : 0;

      let difficulty = 'No Data';

      if (attempts > 0) {

        if (correctRate >= 90) {
          difficulty = 'Easy';

        } else if (correctRate >= 70) {
          difficulty = 'Medium';

        } else {
          difficulty = 'Hard';
        }

      }

      question.setDataValue('attempts', attempts);
      question.setDataValue('correctRate', correctRate);
      question.setDataValue('difficulty', difficulty);

    });
    
    console.log('Exam IDs:', examIds);
    console.log('Completed Sessions:', sessions.length);
    res.json(template);

  } catch (error) {

    console.error('❌ Failed to load template:', error);

    res.status(500).json({
      message: 'Failed to load template',
      error: error.message
    });
  }
});

router.put('/templates/:templateId', auth, isSuperAdmin, async (req, res) => {

  const { templateId } = req.params;

  const {
    title,
    description,
    program,
  } = req.body;

  try {

    const template =
      await ExamTemplates.findByPk(templateId);

    if (!template) {

      return res.status(404).json({
        message: 'Template not found',
      });
    }

    await template.update({
      title,
      description,
      program,
    });

    res.json({
      message: '✅ Template updated successfully',
      template,
    });

  } catch (error) {

    console.error(
      '❌ Failed to update template:',
      error
    );

    res.status(500).json({
      message: 'Failed to update template',
      error: error.message,
    });
  }
});

router.delete('/templates/:templateId', auth, isSuperAdmin, async (req, res) => {

  const { templateId } = req.params;

  try {

    const template = await ExamTemplates.findByPk(templateId);

    if (!template) {
      return res.status(404).json({
        message: 'Template not found',
      });
    }

    const examCount = await Exams.count({
      where: {
        exam_template_id: templateId,
      },
    });

    if (examCount > 0) {
      return res.status(409).json({
        message:
          'This template cannot be deleted because it has been used to create exams.',
      });
    }

    await template.destroy();

    res.json({
      message: '✅ Template deleted successfully',
    });

  } catch (error) {

    console.error(
      '❌ Failed to delete template:',
      error
    );

    res.status(500).json({
      message: 'Failed to delete template',
      error: error.message,
    });

  }

});

router.get('/templates/:templateId/questions', auth, isSuperAdmin, async (req, res) => {

  const { templateId } = req.params;
  const includeAnswers = req.query.includeAnswers === 'true';
  const userRole = req.user?.roleId;

  try {

    const canViewAnswers =
      includeAnswers && (userRole === 2 || userRole === 3);

    const questions = await ExamTemplateQuestions.findAll({
      where: {
        exam_template_id: templateId
      },
      order: [['order', 'ASC']],
      attributes: canViewAnswers
        ? undefined
        : { exclude: ['correct_answers'] },
    });

    if (!questions.length) {
      return res.status(404).json({
        message: `No questions found for template ID ${templateId}`
      });
    }

    res.json({
      count: questions.length,
      questions
    });

  } catch (error) {

    console.error('❌ Failed to fetch template questions:', error);

    res.status(500).json({
      message: 'Failed to fetch template questions',
      error: error.message
    });
  }
});

router.post('/templates/:templateId/questions', auth, isSuperAdmin, async (req, res) => {

  const { templateId } = req.params;
  const { questions } = req.body;

  try {

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        message: 'Questions array is required'
      });
    }

    const formattedQuestions = questions.map((q, index) => {

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

      return {
        exam_template_id: templateId,

        question_type: q.question_type || 'single',

        question_text: q.question_text?.trim(),

        options: q.options || {},

        correct_answers: correctAnswers,

        order: q.order ?? index + 1,

        created_at: new Date(),
        updated_at: new Date(),
      };
    });

    const created =
      await ExamTemplateQuestions.bulkCreate(formattedQuestions);

    res.status(201).json({
      message: '✅ Template questions added successfully',
      count: created.length,
    });

  } catch (error) {

    console.error('❌ Failed to add template questions:', error);

    res.status(500).json({
      message: 'Failed to add template questions',
      error: error.message,
    });
  }
});

router.put('/templates/:templateId/questions/:questionId', auth, isSuperAdmin, async (req, res) => {

    const { templateId, questionId } = req.params;

    const {
      question_text,
      options,
      correct_answers,
      question_type,
    } = req.body;

    try {

      const question =
        await ExamTemplateQuestions.findOne({
          where: {
            id: questionId,
            exam_template_id: templateId,
          },
        });

      if (!question) {
        return res.status(404).json({
          message: 'Question not found',
        });
      }

      await question.update({
        question_text,
        options,
        correct_answers,
        question_type,
      });

      res.json({
        message:
          '✅ Question updated successfully',
        question,
      });

    } catch (error) {

      console.error(
        '❌ Failed to update question:',
        error
      );

      res.status(500).json({
        message:
          'Failed to update question',
        error: error.message,
      });
    }
  }
);

router.delete(
  "/templates/:templateId/questions/:questionId",
  auth,
  isSuperAdmin,
  async (req, res) => {

    const { templateId, questionId } = req.params;

    try {

      const question =
        await ExamTemplateQuestions.findOne({
          where: {
            id: questionId,
            exam_template_id: templateId,
          },
        });

      if (!question) {

        return res.status(404).json({
          message: "Question not found",
        });

      }

      const deletedOrder = question.order;

      await question.destroy();

      const remainingQuestions =
        await ExamTemplateQuestions.findAll({
          where: {
            exam_template_id: templateId,
          },
          order: [["order", "ASC"]],
        });

      for (const q of remainingQuestions) {

        if (q.order > deletedOrder) {

          await q.update({
            order: q.order - 1,
          });

        }

      }

      res.json({
        message: "✅ Question deleted successfully",
      });

    } catch (error) {

      console.error(
        "❌ Failed to delete question:",
        error
      );

      res.status(500).json({
        message: "Failed to delete question",
        error: error.message,
      });

    }

  }
);

router.get(
  '/templates/:templateId/questions/:questionId',
  auth,
  isSuperAdmin,
  async (req, res) => {

    const { templateId, questionId } = req.params;

    try {

      const question =
        await ExamTemplateQuestions.findOne({
          where: {
            id: questionId,
            exam_template_id: templateId,
          },
        });

      if (!question) {

        return res.status(404).json({
          message: 'Question not found',
        });
      }

      res.json(question);

    } catch (error) {

      console.error(
        '❌ Failed to load question:',
        error
      );

      res.status(500).json({
        message:
          'Failed to load question',
        error: error.message,
      });
    }
  }
);

// =====================================================
// CREATE SINGLE QUESTION
// =====================================================

router.post(
  '/templates/:templateId/question',
  auth,
  isSuperAdmin,
  async (req, res) => {

    const { templateId } = req.params;

    const {
      question_type,
      question_text,
      options,
      correct_answers,
    } = req.body;

    try {

      // Find the next display order
      const maxOrder =
        await ExamTemplateQuestions.max(
          'order',
          {
            where: {
              exam_template_id: templateId,
            },
          }
        );

      const question =
        await ExamTemplateQuestions.create({

          exam_template_id: templateId,

          question_type:
            question_type || "single",

          question_text,

          options,

          correct_answers,

          order:
            (maxOrder || 0) + 1,

        });

      res.status(201).json({

        message:
          "✅ Question created successfully",

        question,

      });

    } catch (error) {

      console.error(
        "❌ Failed to create question:",
        error
      );

      res.status(500).json({

        message:
          "Failed to create question",

        error: error.message,

      });

    }

  }
);
module.exports = router;