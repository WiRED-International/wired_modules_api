const router = require('express').Router();
const { QuizScores, Users } = require('../../../models');
const auth = require('../../../middleware/auth');
const sequelize = require('../../../config/connection');
const { Op } = require("sequelize"); 

// GET /api/leaderboard - Returns the top users based on quiz completions and average score
router.get('/', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 10;
  
      const leaderboard = await QuizScores.findAll({
        attributes: [
          'user_id',
          [sequelize.fn('COUNT', sequelize.col('QuizScores.id')), 'completedQuizzes'],
          [sequelize.fn('AVG', sequelize.col('QuizScores.score')), 'averageScore']
        ],
        include: [
          {
            model: Users,
            as: 'user',
            attributes: ['id', 'first_name', 'last_name', 'email'] // Use first_name and last_name
          }
        ],
        where: {
          score: {
            [Op.gte]: 80.0 // Only include quizzes with scores >= 80.0
          }
        },
        group: ['QuizScores.user_id', 'user.id', 'user.first_name', 'user.last_name', 'user.email'],
        order: [
          [sequelize.literal('completedQuizzes'), 'DESC'],
          [sequelize.literal('averageScore'), 'DESC']
        ],
        limit: limit
      });
  
      res.status(200).json(leaderboard);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
  });
  
  module.exports = router;