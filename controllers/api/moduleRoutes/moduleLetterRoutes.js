const router = require('express').Router();
const { Modules, Letters } = require('../../../models');

router.post('/modules-to-letters', async (req, res) => {
    const { module_id, letter_id } = req.body;
    try {
        const module = await Modules.findByPk(module_id);
        if (!module) return res.status(404).json({ error: 'Module not found' });
    
        await module.addLetters(letter_id); 
    
        res.status(200).json({ message: 'Modules associated successfully' });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
});

router.post('/letters-to-modules', async (req, res) => {
  const { letter_id, module_id } = req.body;
  try {
    const letter = await Letters.findByPk(letter_id);
    if (!letter) return res.status(404).json({ error: 'Letter not found' });

    await letter.addModules(module_id); 

    res.status(200).json({ message: 'Letter associated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/modules/:module_id/letters', async (req, res) => {
    const { module_id} = req.params;
    const { letters } = req.body;
    console.log('Module ID:', module_id);
    console.log('Letter IDs:', letters);

  try {
    const module = await Modules.findByPk(module_id);
    if (!module) return res.status(404).json({ error: 'Module not found' });

    await module.setLetters(letters); 

    res.status(200).json({ message: 'Module associations updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/letters/:letter_id/modules', async (req, res) => {
    const { letter_id } = req.params; // Get the letter ID from the URL
    const { module_ids } = req.body; // Get the module IDs from the request body
  
    try {
      
      const letter = await Letters.findByPk(letter_id);
  
      
      if (!letter) return res.status(404).json({ error: 'Letter not found' });
  
      
      await letter.setModules(module_ids);
  
      
      res.status(200).json({ message: 'Letter associations updated successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

module.exports = router;
