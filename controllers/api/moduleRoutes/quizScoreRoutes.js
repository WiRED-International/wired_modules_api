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
  try {
    const { module_id, user_id, score, date_taken } = req.body;

    console.log('📩 Request body:', req.body); // Debug log

    if (!module_id || !user_id || !score) {
      return res.status(400).json({ message: 'module_id, user_id, and score are required' });
    }

    // Ensure user_id and score are valid numbers
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

    const resolvedModuleId = module.id;
    console.log('✅ Resolved Module ID:', resolvedModuleId);

    // ✅ Use UPSERT instead of findOne + save() to prevent race conditions
    const [quizScore, created] = await QuizScores.upsert({
      module_id: resolvedModuleId,
      user_id: parsedUserId,
      score: parsedScore,
      date_taken: date_taken || new Date(),
    });

    res.status(created ? 201 : 200).json({
      message: created ? 'Quiz Score created successfully' : 'Quiz Score updated successfully',
      quizScore,
    });

  } catch (err) {
    console.error('❌ Error:', err);
    res.status(500).json({
      message: 'Internal Server Error',
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