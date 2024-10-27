const router = require('express').Router();
const { Modules, SubCategories } = require('../../models');

router.get('/', async (req, res) => {
  const { subcategoryId } = req.query;
  try {
    const modules = await Modules.findAll({
        include: [
            {
                model: Modules,
                as: 'redirectedModule',
                attributes: ['id', 'name', 'description', 'letters', 'is_downloadable', 'downloadLink']
            },
            {
              model: SubCategories, 
              as: 'subCategories',  
              where: { id: subcategoryId},
              attributes: ['id', 'name', 'category_id'], 
              through: { attributes: [] }, 
            },
        ],
    });
    res.status(200).json(modules);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const module = await Modules.findByPk(req.params.id, {
        include: [
            {
                model: Modules,
                as: 'redirectedModule',
                attributes: ['id', 'name', 'description', 'letters', 'is_downloadable', 'downloadLink']
            },
            {
              model: SubCategories, 
              as: 'subCategories',  
              attributes: ['id', 'name', 'category_id'], 
              through: { attributes: [] }, 
            },
        ],
    });
    if (!module) {
      return res.status(404).json({ message: 'Module not found' });
    }
    res.status(200).json(module);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', async (req, res) => {
    const { name, description, letters, version, is_downloadable, downloadLink, packageSize, redirect_module_id, } = req.body;
  try {

    const newModule = await Modules.create({
        name,
        description,
        letters,
        version,
        is_downloadable: Boolean(is_downloadable),
        downloadLink: is_downloadable ? downloadLink : null,
        packageSize,
        redirect_module_id: is_downloadable ? null : redirect_module_id,
      });

    res.status(201).json({ module: newModule });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', async (req, res) => {
    const { name, description, topics, letters, version, is_downloadable, downloadLink, packageSize, redirect_module_id } = req.body;
  try {
    const module = await Modules.findByPk(req.params.id);
    if (!module) {
      return res.status(404).json({ message: 'Module not found' });
    }
    await module.update({
        name: name || module.name,
        description,
        letters,
        version,
        is_downloadable: Boolean(is_downloadable),
        downloadLink: is_downloadable ? downloadLink : null,
        packageSize,
        redirect_module_id: is_downloadable ? null : redirect_module_id,
    });

    res.status(200).json({ message: "Module updated successfully", module});
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const module = await Modules.findByPk(req.params.id);
    if (!module) {
      return res.status(404).json({ message: 'Module not found' });
    }
    await module.destroy();
    res.status(200).json({ message: 'Module deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;