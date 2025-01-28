const QuizScores = require('../models/moduleModels/quizScores');

const quizScores = [
  {
    user_id: 2,
    module_id: 1,
    score: 61.51,
  },   
  {
    user_id: 2,
    module_id: 3,
    score: 90.11,
  },
  {
    user_id: 2,
    module_id: 5,
    score: 85.35,
  },
  {
    user_id: 2,
    module_id: 7,
    score: 79.99,
  },
  {
    user_id: 2,
    module_id: 12,
    score: 95.00,
  },
];

const quizScoresSeed = async () => {
  try {
    await QuizScores.bulkCreate(quizScores);
    console.log('QuizScores seeded successfully!');
  } catch (err) {
    console.error('Error seeding quizScores:', err);
  }
};

module.exports = quizScoresSeed;