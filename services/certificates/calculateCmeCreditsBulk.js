const {
  CmeCreditAwards,
  CmeCreditBalances,
} = require('../../models');

const { Op } = require('sequelize');

/**
 * Calculates CME credits for multiple users for a single year.
 *
 * Returns a Map keyed by user ID.
 *
 * Each value contains:
 * - moduleCount
 * - openingCredits
 * - awardedCredits
 * - credits
 */
async function calculateCmeCreditsBulk(userIds, year) {
  if (!Array.isArray(userIds) || userIds.length === 0) {
    return new Map();
  }

  const [balances, awards] = await Promise.all([
    CmeCreditBalances.findAll({
      where: {
        user_id: {
          [Op.in]: userIds,
        },
        year,
      },
      attributes: [
        'user_id',
        'opening_credits',
      ],
    }),

    CmeCreditAwards.findAll({
      where: {
        user_id: {
          [Op.in]: userIds,
        },
        year,
      },
      attributes: [
        'user_id',
        'module_id',
        'credits_awarded',
      ],
    }),
  ]);

  const results = new Map();

  // Start every requested user at zero.
  for (const userId of userIds) {
    results.set(Number(userId), {
      moduleCount: 0,
      openingCredits: 0,
      awardedCredits: 0,
      credits: 0,
    });
  }

  // Add opening balances.
  for (const balance of balances) {
    const userId = Number(balance.user_id);
    const result = results.get(userId);

    if (!result) continue;

    result.openingCredits =
      Number(balance.opening_credits) || 0;
  }

  // Add ledger awards.
  for (const award of awards) {
    const userId = Number(award.user_id);
    const result = results.get(userId);

    if (!result) continue;

    const credits =
      Number(award.credits_awarded) || 0;

    result.awardedCredits += credits;

    if (credits > 0) {
      result.moduleCount += 1;
    }
  }

  // Calculate final totals.
  for (const result of results.values()) {
    result.credits =
      result.openingCredits +
      result.awardedCredits;
  }

  return results;
}

module.exports = calculateCmeCreditsBulk;