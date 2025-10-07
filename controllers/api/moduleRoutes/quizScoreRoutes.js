const router = require('express').Router();
const { QuizScores, Modules } = require('../../../models');
const auth = require('../../../middleware/auth');
const isAdmin = require('../../../middleware/isAdmin');
const ROLES = require('../../../utils/roles');

router.get('/', auth, async (req, res) => {
  const { userId } = req.query;
  const userIsAdmin = req.user && (req.user.roleId === ROLES.ADMIN || req.user.roleId === ROLES.SUPER_ADMIN);

  try {
    let quizScores;

    if (userIsAdmin) {
    
      const parsedUserId = userId ? parseInt(userId, 10) : null;
      const whereClause = parsedUserId ? { user_id: parsedUserId } : {};

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
  const userIsAdmin = req.user && (req.user.roleId === ROLES.ADMIN || req.user.roleId === ROLES.SUPER_ADMIN);
  try {
    const quizScore = await QuizScores.findByPk(id, {
      attributes: ['id', 'user_id', 'module_id', 'score', 'date_taken'],
    });

    if (!quizScore) {
      return res.status(404).json({ message: 'Quiz Score not found' });
    }

    // Ensure users can access only their own scores
    if (!userIsAdmin && quizScore.user_id !== req.user.id) {
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

    if (module_id == null || user_id == null || score == null) {
      return res.status(400).json({ message: 'module_id, user_id, and score are required' });
    }

    // Ensure user_id and score are valid numbers
    const parsedUserId = parseInt(user_id, 10);
    const parsedScore = parseFloat(score);

    if (isNaN(parsedUserId) || isNaN(parsedScore)) {
      return res.status(400).json({ message: 'Invalid user_id or score' });
    }

    // Only Admins and Super Admins allowed
    // if (req.user.roleId === 1) {
    //   return res.status(403).json({ message: 'Access denied. Only Admins can create or edit quiz scores.' });
    // }

    // Find the module by the `module_id` field (not the primary key)
    const module = await Modules.findOne({ where: { module_id } });

    if (!module) {
      return res.status(404).json({ message: 'Module not found' });
    }

    const resolvedModuleId = module.id;

    // Use UPSERT instead of findOne + save() to prevent race conditions
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
    console.error('Sequelize error stack:', err.stack);
    res.status(500).json({
      message: 'Internal Server Error',
      errors: err.errors || [],
    });
  }
});

router.put('/:id', auth, isAdmin, async (req, res) => {
  const { id } = req.params;
  const { score, date_taken } = req.body;

  try {
    const quizScore = await QuizScores.findByPk(id);

    if (!quizScore) {
      return res.status(404).json({ message: 'Quiz Score not found' });
    }

    // Validate score
    const parsedScore = parseFloat(score);
    if (isNaN(parsedScore) || parsedScore < 0) {
      return res.status(400).json({ message: 'Invalid score value provided.' });
    }

    await quizScore.update({
      score: parsedScore,
      date_taken: date_taken || quizScore.date_taken,
    });

    res.status(200).json({
      message: 'Quiz Score updated successfully',
      quizScore,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
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