const router = require('express').Router();
const { Modules, SubCategories, Letters } = require('../../../models');

// ============================================
// 🔹 GET all modules
// ============================================
router.get('/', async (req, res) => {
  const { subcategoryId, type } = req.query;

  try {
    const typeFilter = typeof type === 'string' ? type.trim().toLowerCase() : undefined;
    const whereClause = {};
    if (typeFilter && ['module', 'animation'].includes(typeFilter)) {
      whereClause.type = typeFilter; // ENUM('module','animation')
    }

    const queryOptions = {
      where: whereClause, 
      distinct: true,
      order: [['name', 'ASC']], 
      attributes: [
        'id',
        'module_id',
        'name',
        'description',
        'version',
        'downloadLink',
        'language',
        'packageSize',
        'type',
        'credit_type',
        'categories',
      ],
      include: [
        {
          model: Modules,
          as: 'redirectedModule',
          attributes: ['id', 'name', 'module_id', 'description', 'downloadLink', 'language',],
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

// ============================================
// 🔹 GET module names only
// ============================================
router.get('/names', async (req, res) => {
  try {
    const modules = await Modules.findAll({
      attributes: ['id', 'module_id', 'name', 'credit_type', 'categories'],
      order: [['name', 'ASC']], 
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
    const { name, module_id, description, version, downloadLink, language, packageSize, redirect_module_id, type, credit_type, categories, } = req.body;
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
        type,
        credit_type,
        categories,
      });

    res.status(201).json({ module: newModule });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', async (req, res) => {
    const { name, module_id, description, version, downloadLink, language, packageSize, redirect_module_id, type, credit_type, categories } = req.body;
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
        type,
        credit_type,
        categories,
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