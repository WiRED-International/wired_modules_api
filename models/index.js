const Modules = require('./modules');
const SubCategories = require('./subCategories');
const Categories = require('./categories');


// Modules.belongsTo(Modules, { as: 'RedirectedModule', foreignKey: 'redirect_module_id' });
Categories.hasMany(SubCategories, { as: 'subCategories', foreignKey: 'category_id' });
SubCategories.belongsTo(Categories, { as: 'category', foreignKey: 'category_id' });
SubCategories.belongsToMany(Modules, { as: 'modules', through: 'module_subcategory', foreignKey: 'sub_category_id' });


module.exports = {
  Modules,
  SubCategories,
  Categories,
};