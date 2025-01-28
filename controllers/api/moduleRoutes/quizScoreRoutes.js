const router = require('express').Router();
const { QuizScores, Users, Modules } = require('../../../models');
const auth = require('../../../middleware/auth');
const isAdmin = require('../../../middleware/isAdmin');
const isSuperAdmin = require('../../../middleware/isSuperAdmin');

router.get('/', auth, async (req, res) => {
  const { userId } = req.query;

  try {
    let quizScores;

    if (req.user.isAdmin) {
      // Admin: Fetch all scores or scores for a specific user
      const whereClause = userId ? { user_id: userId } : {};
      quizScores = await QuizScores.findAll({
        where: whereClause,
        attributes: ['id', 'user_id', 'module_id', 'score', 'date_taken'],
      });
    } else {
      // Regular user: Fetch only their scores
      quizScores = await QuizScores.findAll({
        where: { user_id: req.user.id },
        attributes: ['id', 'module_id', 'score', 'date_taken'],
        include: [
            {
                model: Modules,
                as: 'module',
                attributes: ['id', 'name', 'module_id', 'description', 'version', 'downloadLink', 'language', 'packageSize', 'redirect_module_id'],
                required: false,
            }
        ]
      });
    }

    res.status(200).json(quizScores);
  } catch (err) {
    console.error('Error creating QuizScores:', err);
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  const { id } = req.params;
  try {
    const quizScore = await QuizScores.findByPk(id, {
      attributes: ['id', 'user_id', 'module_id', 'score', 'date_taken'],
    });

    if (!quizScore) {
      return res.status(404).json({ message: 'Quiz Score not found' });
    }

    // Ensure users can access only their own scores
    if (!req.user.isAdmin && quizScore.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.status(200).json(quizScore);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  const { module_id, user_id, score, date_taken } = req.body;

  console.log('Request body:', req.body); // Debug log

  if (!module_id || !user_id || !score) {
    return res.status(400).json({ message: 'module_id, user_id, and score are required' });
  }

  try {

    // Ensure user_id and score are numbers
    const parsedUserId = parseInt(user_id, 10);
    const parsedScore = parseFloat(score);

    if (isNaN(parsedUserId) || isNaN(parsedScore)) {
      return res.status(400).json({ message: 'Invalid user_id or score' });
    }

    // Find the module by the `module_id` field (not the primary key)
    const module = await Modules.findOne({ where: { module_id } });

    if (!module) {
      return res.status(404).json({ message: 'Module not found' });
    }

    // Use the `id` (primary key) of the matched module for associations
    const resolvedModuleId = module.id;
    console.log('Resolved Module ID:', resolvedModuleId);

    // Check if a quiz score already exists for the given module `id` and user_id
    const existingQuizScore = await QuizScores.findOne({
      where: { module_id: resolvedModuleId, user_id },
    });

    if (existingQuizScore) {
      // Update the existing record
      console.log('Updating existing quiz score:', existingQuizScore);
      existingQuizScore.score = score;
      existingQuizScore.date_taken = date_taken || new Date(); // Update date_taken if provided
      await existingQuizScore.save();

      return res.status(200).json({
        message: 'Quiz Score updated successfully',
        quizScore: existingQuizScore,
      });
    }

    // If no existing record, create a new one
    const quizScore = await QuizScores.create({
      module_id: resolvedModuleId,
      user_id,
      score,
      date_taken: date_taken || new Date(),
    });

    res.status(201).json({
      message: 'Quiz Score created successfully',
      quizScore,
    });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({
      message: 'Validation error',
      errors: err.errors || [],
    });
  }
});

router.delete('/:id', auth, isAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const quizScore = await QuizScores.findByPk(id);
    if (!quizScore) {
      return res.status(404).json({ message: 'Quiz Score not found' });
    }

    await quizScore.destroy();
    res.status(200).json({ message: 'Quiz Score deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;