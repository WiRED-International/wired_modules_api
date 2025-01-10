const router = require('express').Router();
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

router.post('/', async (req, res) => {
    const { name, category_id } = req.body;
  try {

    const newSubCategory = await SubCategories.create({
        name,
        category_id,
      });

    res.status(201).json({ subCategory: newSubCategory });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', async (req, res) => {
    const { name, category_id } = req.body;
  try {
    const subCategory = await SubCategories.findByPk(req.params.id);
    if (!subCategory) {
      return res.status(404).json({ message: 'SubCategory not found' });
    }
    await subCategory.update({
        name,
        category_id,
    });

    res.status(200).json({ message: "SubCategory updated successfully", subCategory});
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const subCategory = await SubCategories.findByPk(req.params.id);
    if (!subCategory) {
      return res.status(404).json({ message: 'SubCategory not found' });
    }
    await subCategory.destroy();
    res.status(200).json({ message: 'SubCategory deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}); 

module.exports = router;