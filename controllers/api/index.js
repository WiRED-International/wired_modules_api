const router = require('express').Router();
const modulesRoutes = require('./moduleRoutes/modulesRoutes');
const categoriesRoutes = require('./moduleRoutes/categoriesRoutes');
const subCategoriesRoutes = require('./moduleRoutes/subCategoriesRoutes');
const moduleSubCategoryRoutes = require('./moduleRoutes/moduleSubCategoryRoutes');
const packagesRoutes = require('./moduleRoutes/packagesRoutes');
const alertsRoutes = require('./alertsRoutes');
const lettersRoutes = require('./moduleRoutes/lettersRoutes');  
const moduleLetterRoutes = require('./moduleRoutes/moduleLetterRoutes');
const rolesRoutes = require('./userRoutes/rolesRoutes');
const userRoutes = require('./userRoutes/userRoutes');
const authRoutes = require('./userRoutes/authRoutes');
const countriesRoutes = require('./userRoutes/countriesRoutes');
const citiesRoutes = require('./userRoutes/citiesRoutes');
const organizationsRoutes = require('./userRoutes/organizationsRoutes');
const adminPermissionsRoutes = require('./userRoutes/adminPermissionsRoutes');
const quizScoreRoutes = require('./moduleRoutes/quizScoreRoutes');
const downloadsroutes = require('./moduleRoutes/downloadsRoutes')


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
router.use('/roles', rolesRoutes);
router.use('/users', userRoutes);
router.use('/auth', authRoutes);
router.use('/countries', countriesRoutes);
router.use('/cities', citiesRoutes);
router.use('/organizations', organizationsRoutes);
router.use('/admin-permissions', adminPermissionsRoutes);
router.use('/quiz-scores', quizScoreRoutes);
router.use('/api/downloads', downloadsroutes);



module.exports = router;
