'use strict';

const router = require('express').Router();
const Alerts = require('../../models/alerts');

// Public endpoint used by HealthMAP.
// Returns the announcement selected by a super administrator.
router.get('/latest', async (req, res) => {
  try {
    const alert = await Alerts.findOne({
      where: { is_active: true },
    });

    if (!alert) {
      return res.status(404).json({
        message: 'No active announcement.',
      });
    }

    return res.status(200).json(alert);
  } catch (error) {
    console.error('Get active announcement error:', error);

    return res.status(500).json({
      message: 'Unable to load announcement.',
    });
  }
});

module.exports = router;
