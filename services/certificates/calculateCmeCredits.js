const { QuizScores, Modules } = require('../../models');
const { Op, fn, col, literal } = require('sequelize');

/**
 * Calculates CME credits dynamically for a user/year
 *
 * Rules:
 * - score >= 80
 * - module.credit_type === 'cme'
 * - each module counts once per year
 * - 5 credits per module
 */
async function calculateCmeCredits(userId, year) {
  const start = new Date(`${year}-01-01T00:00:00Z`);
  const end = new Date(`${year}-12-31T23:59:59Z`);

  const passedModules = await QuizScores.findAll({
    where: {
      user_id: userId,
      score: { [Op.gte]: 80 },
      date_taken: { [Op.between]: [start, end] },
    },
    include: [
      {
        model: Modules,
        as: 'module',
        attributes: [],
        where: { credit_type: 'cme' },
      },
    ],
    attributes: [
      [fn('COUNT', fn('DISTINCT', col('QuizScores.module_id'))), 'module_count'],
    ],
    raw: true,
  });

  const moduleCount = Number(passedModules[0]?.module_count || 0);
  const credits = moduleCount * 5;

  return { moduleCount, credits };
}

module.exports = calculateCmeCredits;
