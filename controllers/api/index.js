const router = require('express').Router();
const modulesRoutes = require('./modulesRoutes');

router.use('/modules', modulesRoutes);
router.use('/categories', categoriesRoutes);
router.use('/subCategories', subCategoriesRoutes);
router.use('/modules-to-subCategories', modulesSubCategoriesRoutes);
router.use('/subCategories-to-modules', modulesSubCategoriesRoutes);
router.use('/packages', packagesRoutes);
router.use('/alerts', alertsRoutes);

module.exports = router;
