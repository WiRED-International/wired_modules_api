const express = require('express');
const router = express.Router();
const { Programs } = require('../../../models');
const auth = require('../../../middleware/auth');
const isAdmin = require('../../../middleware/isAdmin');

// GET All Programs
router.get('/', auth, isAdmin, async (req, res) => {
  try {
    const programs = await Programs.findAll({
      attributes: [
        'id',
        'name',
        'training_type',
        'description',
        'active',
      ],
      order: [['name', 'ASC']],
    });

    res.status(200).json(programs);
  } catch (err) {
    console.error('Error fetching Programs:', err);
    res.status(500).json({ message: err.message });
  }
});

// GET Program by ID
router.get('/:id', auth, isAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const program = await Programs.findByPk(id, {
      attributes: [
        'id',
        'name',
        'training_type',
        'description',
        'active',
      ],
    });

    if (!program) {
      return res.status(404).json({
        message: 'Program not found',
      });
    }

    res.status(200).json(program);
  } catch (err) {
    console.error('Error fetching Program:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;