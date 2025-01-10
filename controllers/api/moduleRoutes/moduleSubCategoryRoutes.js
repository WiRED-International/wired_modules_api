const router = require('express').Router();
const { Modules, SubCategories } = require('../../../models');

router.post('/modules-to-subCategories', async (req, res) => {
    const { module_id, subcategory_id } = req.body;
    try {
        const module = await Modules.findByPk(module_id);
        if (!module) return res.status(404).json({ error: 'Module not found' });
    
        await module.addSubCategories(subcategory_id); 
    
        res.status(201).json({ message: 'Modules associated successfully' });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
});

router.post('/subCategories-to-modules', async (req, res) => {
  const { subcategory_id, module_id } = req.body;
  try {
    const subCategory = await SubCategories.findByPk(subcategory_id);
    if (!subCategory) return res.status(404).json({ error: 'SubCategory not found' });

    await subCategory.addModules(module_id); 

    res.status(201).json({ message: 'SubCategory associated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/modules/:module_id/subCategories', async (req, res) => {
    const { module_id} = req.params;
    const { subCategories } = req.body;
    console.log('Module ID:', module_id);
    console.log('SubCategory IDs:', subCategories);

  try {
    const module = await Modules.findByPk(module_id);
    if (!module) return res.status(404).json({ error: 'Module not found' });

    await module.addSubCategories(subCategories); 

    res.status(200).json({ message: 'Module associations updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/subcategories/:subcategory_id/modules', async (req, res) => {
    const { sub_category_id } = req.params; // Get the subcategory ID from the URL
    const { module_ids } = req.body; // Get the module IDs from the request body
  
    try {
      
      const subCategory = await SubCategories.findByPk(sub_category_id);
  
      
      if (!subCategory) return res.status(404).json({ error: 'SubCategory not found' });
  
      
      await subCategory.addModules(module_ids);
  
      
      res.status(200).json({ message: 'SubCategory associations updated successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

module.exports = router;
