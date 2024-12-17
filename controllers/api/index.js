const router = require('express').Router();
const modulesRoutes = require('./modulesRoutes');
const categoriesRoutes = require('./categoriesRoutes');
const subCategoriesRoutes = require('./subCategoriesRoutes');
const moduleSubCategoryRoutes = require('./moduleSubCategoryRoutes');
const packagesRoutes = require('./packagesRoutes');
const alertsRoutes = require('./alertsRoutes');
const lettersRoutes = require('./lettersRoutes');  
const moduleLetterRoutes = require('./moduleLetterRoutes');
const userRoutes = require('./userRoutes');
const authRoutes = require('./authRoutes');

router.use('/modules', modulesRoutes);
router.use('/categories', categoriesRoutes);
router.use('/subCategories', subCategoriesRoutes);
router.use('/modules-to-subCategories', moduleSubCategoryRoutes);
router.use('/subCategories-to-modules', moduleSubCategoryRoutes);
router.use('/packages', packagesRoutes);
router.use('/alerts', alertsRoutes);
router.use('/letters', lettersRoutes);
router.use('/modules-to-letters', moduleLetterRoutes);
router.use('/letters-to-modules', moduleLetterRoutes);
router.use('/users', userRoutes);
router.use('/auth', authRoutes);

module.exports = router;
