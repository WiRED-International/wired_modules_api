const router = require('express').Router();
const { Packages } = require('../../../models/');

router.get('/', async (req, res) => {
  try {
    const packages = await Packages.findAll();
    res.status(200).json(packages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
//get packages name only
router.get('/names', async (req, res) => {
  try {
    const packages = await Packages.findAll({
      attributes: ['id', 'name'],
      order: [['name', 'ASC']], 
    });
    res.status(200).json(packages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const packageData = await Packages.findByPk(req.params.id);
    if (!packageData) {
      return res.status(404).json({ message: 'Package not found' });
    }
    res.status(200).json(packageData);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', async (req, res) => {
    const { name, description, letters, version, downloadLink, packageSize, } = req.body;
  try {

    const newPackage = await Packages.create({
        name,
        description,
        letters,
        version,
        downloadLink,
        packageSize,
      });

    res.status(201).json({ package: newPackage });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', async (req, res) => {
    const { name, description, letters, version, downloadLink, packageSize, } = req.body;
  try {
    const packageData = await Packages.findByPk(req.params.id);
    if (!packageData) {
      return res.status(404).json({ message: 'Package not found' });
    }
    await packageData.update({
        name: name || packageData.name,
        description,
        letters,
        version,
        downloadLink,
        packageSize,
    });

    res.status(200).json({ message: "Package updated successfully", package: packageData});
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const packageData = await Packages.findByPk(req.params.id);
    if (!packageData) {
      return res.status(404).json({ message: 'Package not found' });
    }
    await packageData.destroy();
    res.status(200).json({ message: 'Package deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;