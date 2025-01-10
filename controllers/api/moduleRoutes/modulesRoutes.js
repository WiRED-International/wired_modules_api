const router = require('express').Router();
const { Modules, SubCategories, Letters } = require('../../../models');

router.get('/', async (req, res) => {
  const { subcategoryId } = req.query;

  try {
    const queryOptions = {
      include: [
        {
          model: Modules,
          as: 'redirectedModule',
          attributes: ['id', 'name', 'module_id', 'description', 'downloadLink', 'language'],
        },
        {
          model: SubCategories,
          as: 'subCategories',
          attributes: ['id', 'name', 'category_id'],
          through: { attributes: [] },
          ...(subcategoryId ? { where: { id: subcategoryId } } : {}),
        },
        { 
          model: Letters, 
          as: 'letters', 
          attributes: ['id', 'letters'] 
        },
      ],
    };

    const modules = await Modules.findAll(queryOptions);
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
                attributes: ['id', 'name', 'module_id', 'description', 'downloadLink', 'language'],
            },
            {
              model: SubCategories, 
              as: 'subCategories',  
              attributes: ['id', 'name', 'category_id'], 
              through: { attributes: [] }, 
            },
            { 
              model: Letters, 
              as: 'letters', 
              attributes: ['id', 'letters'] 
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
    const { name, module_id, description, version, downloadLink, language, packageSize, redirect_module_id, } = req.body;
  try {

    const newModule = await Modules.create({
        name,
        module_id,
        description,
        version,
        downloadLink,
        language,
        packageSize,
        redirect_module_id,
      });

    res.status(201).json({ module: newModule });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', async (req, res) => {
    const { name, module_id, description, version, downloadLink, language, packageSize, redirect_module_id } = req.body;
  try {
    const module = await Modules.findByPk(req.params.id);
    if (!module) {
      return res.status(404).json({ message: 'Module not found' });
    }
    await module.update({
        name: name || module.name,
        module_id,
        description,
        version,
        downloadLink,
        language,
        packageSize,
        redirect_module_id,
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