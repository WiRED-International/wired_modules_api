const router = require('express').Router();
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

router.post('/', async (req, res) => {
    const { name } = req.body;
  try {

    const newCategory = await Categories.create({
        name,
      });

    res.status(201).json({ category: newCategory });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', async (req, res) => {
    const { name } = req.body;
  try {
    const category = await Categories.findByPk(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    await category.update({
        name,
    });

    res.status(200).json({ message: "Category updated successfully", category});
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const category = await Categories.findByPk(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    await category.destroy();
    res.status(200).json({ message: 'Category deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;