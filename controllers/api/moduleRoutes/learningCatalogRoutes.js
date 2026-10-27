
const router = require('express').Router();
const { Programs, Specializations } = require('../../../models');

// Public read-only list of active training programs.
router.get('/programs', async (req, res) => {
  try {
    const programs = await Programs.findAll({
      where: { active: true },
      attributes: [
        'id',
        'name',
        'training_type',
        'description',
      ],
      order: [['name', 'ASC']],
    });

    return res.status(200).json(programs);
  } catch (err) {
    console.error('Error fetching learning programs:', err);
    return res.status(500).json({
      message: 'Unable to retrieve training programs.',
    });
  }
});

// Public read-only list of specializations.
router.get('/specializations', async (req, res) => {
  try {
    const specializations = await Specializations.findAll({
      attributes: ['id', 'name'],
      order: [['name', 'ASC']],
    });

    return res.status(200).json(specializations);
  } catch (err) {
    console.error('Error fetching learning specializations:', err);
    return res.status(500).json({
      message: 'Unable to retrieve specializations.',
    });
  }
});

module.exports = router;
