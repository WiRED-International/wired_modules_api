const router = require('express').Router();
const { Letters, Modules } = require('../../../models');

router.get('/', async (req, res) => {
  try {
    const letters = await Letters.findAll({
        include: [
            {
                model: Modules,
                as: 'modules',
                attributes: ['id', 'name', 'description', 'downloadLink', 'language', 'module_id', 'redirect_module_id'],
                through: { attributes: [] },
            },
        ],
    });
    res.status(200).json(letters);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const letter = await Letters.findByPk(
        req.params.id,
        {
            include: [
                {
                    model: Modules,
                    as: 'modules',
                    attributes: ['id', 'name', 'description', 'downloadLink', 'language', 'module_id', 'redirect_module_id'],
                    through: { attributes: [] },
                },
            ],
        }
    );
    if (!letter) {
      return res.status(404).json({ message: 'Letter not found' });
    }
    res.status(200).json(letter);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', async (req, res) => {
    const { letters } = req.body;
  try {

    const newLetter = await Letters.create({
        letters,
      });

    res.status(201).json({ letter: newLetter });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', async (req, res) => {
    const { letters } = req.body;
  try {
    const letter = await Letters.findByPk(req.params.id);
    if (!letter) {
      return res.status(404).json({ message: 'Letter not found' });
    }
    await letter.update({
        letters,
    });

    res.status(200).json({ message: "Letter updated successfully", letter});
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const letter = await Letters.findByPk(req.params.id);
    if (!letter) {
      return res.status(404).json({ message: 'Letter not found' });
    }
    await letter.destroy();
    res.status(200).json({ message: 'Letter deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;