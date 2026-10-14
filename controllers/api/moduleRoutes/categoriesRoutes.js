const router = require('express').Router();
const auth = require('../../../middleware/auth');
const requireRoles = require('../../../middleware/requireRoles');
const ROLES = require('../../../utils/roles');
const { Categories, SubCategories } = require('../../../models');

router.get('/', async (req, res) => {
  try {
    const categories = await Categories.findAll({
        include: [
            {
                model: SubCategories,
                as: 'subCategories',
                attributes: ['id', 'name']
            },
        ],
    });
    res.status(200).json(categories);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const category = await Categories.findByPk(req.params.id, {
        include: [
            {
                model: SubCategories,
                as: 'subCategories',
                attributes: ['id', 'name']
            },
        ],
    });
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    res.status(200).json(category);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, requireRoles(ROLES.SUPER_ADMIN), async (req, res) => {
    const { name } = req.body;
  try {
    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        message: 'Category name is required.',
      });
    }

    const existingCategory = await Categories.findOne({
      where: { name: name.trim() },
    });

    if (existingCategory) {
      return res.status(409).json({
        message: 'A category with this name already exists.',
      });
    }

    const newCategory = await Categories.create({
      name: name.trim(),
    });

    res.status(201).json({ category: newCategory });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, requireRoles(ROLES.SUPER_ADMIN), async (req, res) => {
    const { name } = req.body;
  try {
    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        message: 'Category name is required.',
      });
    }

    const category = await Categories.findByPk(req.params.id);

    if (!category) {
      return res.status(404).json({
        message: 'Category not found',
      });
    }

    const existingCategory = await Categories.findOne({
      where: { name: name.trim() },
    });

    if (existingCategory && existingCategory.id !== category.id) {
      return res.status(409).json({
        message: 'A category with this name already exists.',
      });
    }

    await category.update({
      name: name.trim(),
    });

    res.status(200).json({ message: "Category updated successfully", category});
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, requireRoles(ROLES.SUPER_ADMIN), async (req, res) => {
  try {
    const category = await Categories.findByPk(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    const subCategoryCount = await SubCategories.count({
      where: { category_id: category.id },
    });

    if (subCategoryCount > 0) {
      return res.status(409).json({
        message:
          'This category cannot be deleted because it contains one or more subcategories.',
        subCategoryCount,
      });
    }

    await category.destroy();
    res.status(200).json({ message: 'Category deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;