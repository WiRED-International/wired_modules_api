const router = require('express').Router();
const { Organizations, Countries, Cities } = require('../../../models');

router.get('/', async (req, res) => {
  try {
    const organizations = await Organizations.findAll({
      include: [
        {
          model: Countries,
          as: 'countries',              // ✅ updated alias
          attributes: ['id', 'name'],
          through: { attributes: [] },  // ✅ hide join table
        },
        {
          model: Cities,
          as: 'cities',
          attributes: ['id', 'name'],
        },
      ],
    });

    res.status(200).json(organizations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const organization = await Organizations.findByPk(req.params.id, {
      include: [
        {
          model: Countries,
          as: 'countries',               // ✅ plural
          attributes: ['id', 'name'],
          through: { attributes: [] },   // ✅ hide join table
        },
        {
          model: Cities,
          as: 'cities',
          attributes: ['id', 'name'],
        },
      ],
    });

    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    res.status(200).json(organization);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', async (req, res) => {
  const { name, country_ids = [], city_id } = req.body;

  try {
    const organization = await Organizations.create({
      name,
      city_id,
    });

    if (country_ids.length > 0) {
      await organization.setCountries(country_ids); // ✅ Sequelize magic
    }

    const createdOrg = await Organizations.findByPk(organization.id, {
      include: [
        {
          model: Countries,
          as: 'countries',
          attributes: ['id', 'name'],
          through: { attributes: [] },
        },
      ],
    });

    res.status(201).json({ organization: createdOrg });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', async (req, res) => {
  const { name, country_ids } = req.body;

  try {
    const organization = await Organizations.findByPk(req.params.id);
    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    if (name) {
      await organization.update({ name });
    }

    if (Array.isArray(country_ids)) {
      await organization.setCountries(country_ids); // replaces associations
    }

    res.status(200).json({
      message: 'Organization updated successfully',
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const organization = await Organizations.findByPk(req.params.id);
    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }
    await organization.destroy();
    res.status(200).json({ message: 'Organization deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}); 

module.exports = router;