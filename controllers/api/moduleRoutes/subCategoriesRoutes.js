const router = require('express').Router();
const auth = require('../../../middleware/auth');
const requireRoles = require('../../../middleware/requireRoles');
const ROLES = require('../../../utils/roles');
const { SubCategories, Categories, Modules } = require('../../../models');

router.get('/', async (req, res) => {
  try {
    const subCategories = await SubCategories.findAll({
        include: [
            {
                model: Categories,
                as: 'category',
                attributes: ['id', 'name'],
            },
            {
              model: Modules, 
              as: 'modules', 
              attributes: ['id', 'name', 'description', 'downloadLink', 'language', 'module_id', 'redirect_module_id'],
              through: { attributes: [] }, 
            },
        ],
    });
    res.status(200).json(subCategories);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const subCategory = await SubCategories.findByPk(req.params.id, {
        include: [
            {
                model: Categories,
                as: 'category',
                attributes: ['id', 'name'],
            },
            {
              model: Modules, 
              as: 'modules', 
              attributes: ['id', 'name', 'description', 'downloadLink', 'language', 'module_id', 'redirect_module_id'],
              through: { attributes: [] }, 
            },
        ],
    });
    if (!subCategory) {
      return res.status(404).json({ message: 'SubCategory not found' });
    }
    res.status(200).json(subCategory);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, requireRoles(ROLES.SUPER_ADMIN), async (req, res) => {
  const { name, category_id } = req.body;

  try {
    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        message: 'Subcategory name is required.',
      });
    }

    const categoryId = Number(category_id);

    if (!Number.isSafeInteger(categoryId) || categoryId < 1) {
      return res.status(400).json({
        message: 'A valid parent category is required.',
      });
    }

    const parentCategory = await Categories.findByPk(categoryId);

    if (!parentCategory) {
      return res.status(404).json({
        message: 'Parent category not found.',
      });
    }

    const existingSubCategory = await SubCategories.findOne({
      where: {
        name: name.trim(),
        category_id: categoryId,
      },
    });

    if (existingSubCategory) {
      return res.status(409).json({
        message: 'A subcategory with this name already exists in the selected category.',
      });
    }

    const newSubCategory = await SubCategories.create({
      name: name.trim(),
      category_id: categoryId,
    });

    res.status(201).json({ subCategory: newSubCategory });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, requireRoles(ROLES.SUPER_ADMIN), async (req, res) => {
  const { name, category_id } = req.body;

  try {
    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        message: 'Subcategory name is required.',
      });
    }

    const categoryId = Number(category_id);

    if (!Number.isSafeInteger(categoryId) || categoryId < 1) {
      return res.status(400).json({
        message: 'A valid parent category is required.',
      });
    }

    const parentCategory = await Categories.findByPk(categoryId);

    if (!parentCategory) {
      return res.status(404).json({
        message: 'Parent category not found.',
      });
    }

    const subCategory = await SubCategories.findByPk(req.params.id);

    if (!subCategory) {
      return res.status(404).json({
        message: 'SubCategory not found',
      });
    }

    const existingSubCategory = await SubCategories.findOne({
      where: {
        name: name.trim(),
        category_id: categoryId,
      },
    });

    if (existingSubCategory && existingSubCategory.id !== subCategory.id) {
      return res.status(409).json({
        message: 'A subcategory with this name already exists in the selected category.',
      });
    }

    await subCategory.update({
      name: name.trim(),
      category_id: categoryId,
    });

    res.status(200).json({
      message: 'SubCategory updated successfully',
      subCategory,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, requireRoles(ROLES.SUPER_ADMIN), async (req, res) => {
  try {
    const subCategory = await SubCategories.findByPk(req.params.id);
    if (!subCategory) {
      return res.status(404).json({ message: 'SubCategory not found' });
    }
    const moduleCount = await subCategory.countModules();

    if (moduleCount > 0) {
      return res.status(409).json({
        message:
          'This subcategory cannot be deleted because it is associated with one or more modules.',
        moduleCount,
      });
    }

    await subCategory.destroy();
    res.status(200).json({ message: 'SubCategory deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}); 

module.exports = router;