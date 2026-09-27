'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // ---------------------------------------------------------
      // 1. Preserve each user's existing CME balance as the
      //    opening balance for that user's current CME year.
      //
      //    Subtract any positive ledger awards that already exist
      //    so those credits are not counted twice.
      // ---------------------------------------------------------
      await queryInterface.sequelize.query(
        `
        INSERT INTO cme_credit_balances
          (user_id, year, opening_credits, created_at, updated_at)
        SELECT
          u.id,
          u.cme_year,
          GREATEST(
            u.cme_credits - COALESCE(SUM(a.credits_awarded), 0),
            0
          ),
          NOW(),
          NOW()
        FROM users u
        LEFT JOIN cme_credit_awards a
          ON a.user_id = u.id
          AND a.year = u.cme_year
          AND a.credits_awarded > 0
        WHERE u.cme_year IS NOT NULL
          AND u.cme_credits > 0
        GROUP BY
          u.id,
          u.cme_year,
          u.cme_credits
        ON DUPLICATE KEY UPDATE
          opening_credits = opening_credits;
        `,
        { transaction }
      );

      // ---------------------------------------------------------
      // 2. Protect visible legacy CME passes from being awarded
      //    again during the same calendar year.
      //
      //    credits_awarded = 0 because those historical credits
      //    are already represented by the opening balance.
      // ---------------------------------------------------------
      await queryInterface.sequelize.query(
        `
        INSERT INTO cme_credit_awards
          (
            user_id,
            module_id,
            year,
            credits_awarded,
            awarded_at,
            created_at,
            updated_at
          )
        SELECT
          qs.user_id,
          qs.module_id,
          YEAR(qs.date_taken),
          0,
          qs.date_taken,
          NOW(),
          NOW()
        FROM quiz_scores qs
        INNER JOIN modules m
          ON m.id = qs.module_id
        INNER JOIN users u
          ON u.id = qs.user_id
        LEFT JOIN cme_credit_awards a
          ON a.user_id = qs.user_id
          AND a.module_id = qs.module_id
          AND a.year = YEAR(qs.date_taken)
        WHERE qs.score >= 80
          AND m.credit_type = 'cme'
          AND qs.date_taken IS NOT NULL
          AND u.cme_year = YEAR(qs.date_taken)
          AND u.cme_credits > 0
          AND a.id IS NULL
        `,
        { transaction }
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    // Historical CME data must not be automatically deleted during
    // rollback because the tables may contain legitimate awards that
    // were created after this migration ran.
    //
    // Any rollback of this historical backfill should be handled
    // manually after reviewing the affected records.
  },
};
