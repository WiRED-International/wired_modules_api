const Modules = require('./modules');
const SubCategories = require('./subCategories');
const Categories = require('./categories');


Modules.belongsTo(Modules, { as: 'RedirectedModule', foreignKey: 'redirect_module_id' });
Categories.hasMany(SubCategories, { as: 'subCategories', foreignKey: 'category_id' });
SubCategories.belongsTo(Categories, { as: 'category', foreignKey: 'category_id' });
SubCategories.belongsToMany(Modules, { as: 'modules', through: 'module_subcategory', foreignKey: 'subcategory_id' });
Modules.belongsToMany(SubCategories, { as: 'subCategories', through: 'module_subcategory', foreignKey: 'module_id' });


module.exports = {
  Modules,
  SubCategories,
  Categories,
};