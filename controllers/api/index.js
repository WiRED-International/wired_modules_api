const router = require('express').Router();
const modulesRoutes = require('./modulesRoutes');

router.use('/modules', modulesRoutes);
router.use('/categories', categoriesRoutes);
router.use('/subCategories', subCategoriesRoutes);

module.exports = router;