const router = require('express').Router();
const { Module } = require('../../models');

router.get('/', async (req, res) => {
  try {
    const modules = await Module.find();
    res.status(200).json(modules);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const module = await Module.findById(req.params.id);
    if (!module) {
      return res.status(404).json({ message: 'Module not found' });
    }
    res.status(200).json(module);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;