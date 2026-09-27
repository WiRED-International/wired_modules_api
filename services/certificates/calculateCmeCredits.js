const {
  CmeCreditAwards,
  CmeCreditBalances,
} = require('../../models');

/**
 * Calculates CME credits for a user/year.
 *
 * Total CME credits consist of:
 * - opening_credits: credits earned before the CME award ledger became active
 * - ledger awards: CME credits awarded after the ledger became active
 */
async function calculateCmeCredits(userId, year) {
  const [balance, awards] = await Promise.all([
    CmeCreditBalances.findOne({
      where: {
        user_id: userId,
        year,
      },
      attributes: ['opening_credits'],
    }),

    CmeCreditAwards.findAll({
      where: {
        user_id: userId,
        year,
      },
      attributes: ['module_id', 'credits_awarded'],
    }),
  ]);

  const openingCredits = balance?.opening_credits ?? 0;

  const awardedCredits = awards.reduce(
    (total, award) => total + award.credits_awarded,
    0
  );

  const moduleCount = awards.filter(
    (award) => award.credits_awarded > 0
  ).length;

  return {
    moduleCount,
    openingCredits,
    awardedCredits,
    credits: openingCredits + awardedCredits,
  };
}

module.exports = calculateCmeCredits;