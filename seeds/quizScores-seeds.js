const QuizScores = require('../models/userModels/quizScores');

const quizScores = [
  {
    user_id: 1,
    quiz_id: 1,
    score: 10,
  },
  {
    user_id: 1,
    quiz_id: 2,
    score: 8,
  },
  {
    user_id: 1,
    quiz_id: 3,
    score: 9,
  },
  {
    user_id: 1,
    quiz_id: 4,
    score: 7,
  },
  {
    user_id: 1,
    quiz_id: 5,
    score: 6,
  },
  {
    user_id: 1,
    quiz_id: 6,
    score: 5,
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