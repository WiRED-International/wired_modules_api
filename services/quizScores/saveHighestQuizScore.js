const { UniqueConstraintError } = require('sequelize');
const { QuizScores } = require('../../models');
const sequelize = require('../../config/connection');

async function saveHighestQuizScore({
  userId,
  moduleId,
  score,
  dateTaken,
}) {
  async function saveAttempt() {
    return sequelize.transaction(async (transaction) => {
      const existing = await QuizScores.findOne({
        where: {
          user_id: userId,
          module_id: moduleId,
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (existing) {
        // A lower or equal score must not replace the best result.
        if (score <= existing.score) {
          return {
            quizScore: existing,
            created: false,
            improved: false,
          };
        }

        await existing.update(
          {
            score,
            date_taken: dateTaken,
          },
          { transaction }
        );

        return {
          quizScore: existing,
          created: false,
          improved: true,
        };
      }

      const quizScore = await QuizScores.create(
        {
          user_id: userId,
          module_id: moduleId,
          score,
          date_taken: dateTaken,
        },
        { transaction }
      );

      return {
        quizScore,
        created: true,
        improved: true,
      };
    });
  }

  // Retry recoverable concurrency conflicts in a fresh transaction.
  // The retry limit prevents an endless loop if the database is busy.
  const MAX_ATTEMPTS = 3;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await saveAttempt();
    } catch (error) {
      const databaseCode =
        error.parent?.code || error.original?.code;

      const isRetryable =
        error instanceof UniqueConstraintError ||
        databaseCode === 'ER_LOCK_DEADLOCK' ||
        databaseCode === 'ER_LOCK_WAIT_TIMEOUT';

      if (!isRetryable || attempt === MAX_ATTEMPTS) {
        throw error;
      }
    }
  }
}

module.exports = saveHighestQuizScore;