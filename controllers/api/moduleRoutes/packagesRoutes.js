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

router.get('/:id', async (req, res) => {
  try {
    const package = await Packages.findByPk(req.params.id);
    if (!package) {
      return res.status(404).json({ message: 'Package not found' });
    }
    res.status(200).json(package);
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
    const package = await Packages.findByPk(req.params.id);
    if (!package) {
      return res.status(404).json({ message: 'Package not found' });
    }
    await package.update({
        name: name || package.name,
        description,
        letters,
        version,
        downloadLink,
        packageSize,
    });

    res.status(200).json({ message: "Package updated successfully", package});
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const package = await Packages.findByPk(req.params.id);
    if (!package) {
      return res.status(404).json({ message: 'Package not found' });
    }
    await package.destroy();
    res.status(200).json({ message: 'Package deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;