const router = require('express').Router();
const { Cities, Countries } = require('../../../models');

router.get('/', async (req, res) => {
  try {
    const cities = await Cities.findAll({
        include: [
            {
                model: Countries,
                as: 'country',
                attributes: ['id', 'name'],
            },
        ],
    });
    res.status(200).json(cities);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const city = await Cities.findByPk(req.params.id);
    if (!city) {
      return res.status(404).json({ message: 'City not found' });
    }
    res.status(200).json(city);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', async (req, res) => {
    const { name, country_id } = req.body;
  try {
    const newCity = await Cities.create({
        name,
        country_id,
    });

    res.status(201).json({ city: newCity });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', async (req, res) => {
    const { name } = req.body;
  try {
    const city = await Cities.findByPk(req.params.id);
    if (!city) {
      return res.status(404).json({ message: 'City not found' });
    }
    await city.update({
        name: name || city.name,
    });

    res.status(200).json({ message: "City updated successfully", city});
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const city = await Cities.findByPk(req.params.id);
    if (!city) {
      return res.status(404).json({ message: 'City not found' });
    }
    await city.destroy();
    res.status(200).json({ message: 'City deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;