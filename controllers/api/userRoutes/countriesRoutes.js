const router = require('express').Router();
const { Countries } = require('../../../models');
const { Op } = require('sequelize');


router.get('/', async (req, res) => {
  const { query } = req.query;
  try {
    const countries = await Countries.findAll({
      where: {
        name: {
          [Op.like]: `${query}%`,
        },
      },
      attributes: ['id', 'name'],
    });
    res.status(200).json(countries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const country = await Countries.findByPk(req.params.id);
    if (!country) {
      return res.status(404).json({ message: 'Country not found' });
    }
    res.status(200).json(country);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', async (req, res) => {
    const { name } = req.body;
  try {
    const newCountry = await Countries.create({
        name,
    });

    res.status(201).json({ country: newCountry });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', async (req, res) => {
    const { name } = req.body;
  try {
    const country = await Countries.findByPk(req.params.id);
    if (!country) {
      return res.status(404).json({ message: 'Country not found' });
    }
    await country.update({
        name: name || country.name,
    });

    res.status(200).json({ message: "Country updated successfully", country});
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const country = await Countries.findByPk(req.params.id);
    if (!country) {
      return res.status(404).json({ message: 'Country not found' });
    }
    await country.destroy();
    res.status(200).json({ message: 'Country deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

