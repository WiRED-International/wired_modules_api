'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add the active announcement flag.
    await queryInterface.addColumn('alerts', 'is_active', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Indicates which announcement is displayed in HealthMAP',
    });

    // Preserve the announcement currently displayed by HealthMAP.
    const [alerts] = await queryInterface.sequelize.query(`
      SELECT id
      FROM alerts
      ORDER BY created_at DESC, id DESC
      LIMIT 1
    `);

    if (alerts.length > 0) {
      await queryInterface.bulkUpdate(
        'alerts',
        { is_active: true },
        { id: alerts[0].id }
      );
    }

    // MySQL permits multiple NULL values in a unique index.
    // Active announcements generate 1; inactive ones generate NULL.
    await queryInterface.sequelize.query(`
      ALTER TABLE alerts
      ADD COLUMN active_slot TINYINT
        GENERATED ALWAYS AS (
          CASE WHEN is_active = 1 THEN 1 ELSE NULL END
        ) STORED,
      ADD UNIQUE INDEX uq_alerts_single_active (active_slot)
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE alerts
      DROP INDEX uq_alerts_single_active,
      DROP COLUMN active_slot
    `);

    await queryInterface.removeColumn('alerts', 'is_active');
  },
};

