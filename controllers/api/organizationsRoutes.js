const router = require('express').Router();
const { Organizations } = require('../../models');

router.get('/', async (req, res) => {
  try {
    const organizations = await Organizations.findAll();
    res.status(200).json(organizations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const organization = await Organizations.findByPk(req.params.id);
    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }
    res.status(200).json(organization);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', async (req, res) => {
    const { name, country_id, city_id } = req.body;
  try {
    const newOrganization = await Organizations.create({
        name,
        country_id,
        city_id,
    });

    res.status(201).json({ organization: newOrganization });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', async (req, res) => {
    const { name } = req.body;
  try {
    const organization = await Organizations.findByPk(req.params.id);
    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }
    await organization.update({
        name: name || organization.name,
    });

    res.status(200).json({ message: "Organization updated successfully", organization});
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