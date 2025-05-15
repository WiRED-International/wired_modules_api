const express = require('express');
const router = express.Router();
const Specializations = require('../../../models');
const auth = require('../../../middleware/auth');
const isAdmin = require('../../../middleware/isAdmin');

// GET All Specializations
router.get('/', auth, isAdmin, async (req, res) => {
  try {
    const specializations = await Specializations.findAll({
      attributes: ['id', 'name'],
    });
    res.status(200).json(specializations);
  } catch (err) {
    console.error('Error fetching Specializations:', err);
    res.status(500).json({ message: err.message });
  }
});

// GET Specialization by ID
router.get('/:id', auth, isAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const specialization = await Specializations.findByPk(id, {
      attributes: ['id', 'name'],
    });

    if (!specialization) {
      return res.status(404).json({ message: 'Specialization not found' });
    }

    res.status(200).json(specialization);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST - Create New Specialization
router.post('/', auth, isAdmin, async (req, res) => {
  const { name } = req.body;

  if (!name || name.trim() === '') {
    return res.status(400).json({ message: 'Specialization name is required.' });
  }

  try {
    const [specialization, created] = await Specializations.findOrCreate({
      where: { name },
    });

    res.status(created ? 201 : 200).json({
      message: created ? 'Specialization created successfully.' : 'Specialization already exists.',
      specialization,
    });
  } catch (err) {
    console.error('Error creating Specialization:', err);
    res.status(500).json({ message: err.message });
  }
});

// PUT - Update Existing Specialization
router.put('/:id', auth, isAdmin, async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  if (!name || name.trim() === '') {
    return res.status(400).json({ message: 'Specialization name is required.' });
  }

  try {
    const specialization = await Specializations.findByPk(id);

    if (!specialization) {
      return res.status(404).json({ message: 'Specialization not found' });
    }

    await specialization.update({ name });

    res.status(200).json({
      message: 'Specialization updated successfully.',
      specialization,
    });
  } catch (err) {
    console.error('Error updating Specialization:', err);
    res.status(500).json({ message: err.message });
  }
});

// DELETE - Delete Specialization
router.delete('/:id', auth, isAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const specialization = await Specializations.findByPk(id);

    if (!specialization) {
      return res.status(404).json({ message: 'Specialization not found' });
    }

    await specialization.destroy();
    res.status(200).json({ message: 'Specialization deleted successfully.' });
  } catch (err) {
    console.error('Error deleting Specialization:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
