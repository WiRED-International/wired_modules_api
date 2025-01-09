const Modules = require('./modules');
const SubCategories = require('./subCategories');
const Categories = require('./categories');
const Letters = require('./letters');
const Alerts = require('./alerts');
const Countries = require('./countries');
const Cities = require('./cities');
const Organizations = require('./organizations');
const Users = require('./users');
const Admins = require('./admins');

Modules.belongsTo(Modules, { as: 'RedirectedModule', foreignKey: 'redirect_module_id' });

Categories.hasMany(SubCategories, { as: 'subCategories', foreignKey: 'category_id' });
SubCategories.belongsTo(Categories, { as: 'category', foreignKey: 'category_id' });

SubCategories.belongsToMany(Modules, { as: 'modules', through: 'module_subcategory', foreignKey: 'subcategory_id' });
Modules.belongsToMany(SubCategories, { as: 'subCategories', through: 'module_subcategory', foreignKey: 'module_id' });

Modules.belongsToMany(Letters, {as: 'letters', through: 'module_letter', foreignKey: 'module_id'}); 
Letters.belongsToMany(Modules, { as: 'modules', through: 'module_letter', foreignKey: 'letter_id' });

Users.belongsTo(Countries, { as: 'country', foreignKey: 'country_id' });
Countries.hasMany(Users, { as: 'users', foreignKey: 'country_id' });

Users.belongsTo(Cities, { as: 'city', foreignKey: 'city_id' });
Cities.hasMany(Users, { as: 'users', foreignKey: 'city_id' });

Users.belongsTo(Organizations, { as: 'organization', foreignKey: 'organization_id' });
Organizations.hasMany(Users, { as: 'users', foreignKey: 'organization_id' });

Admins.belongsTo(Organizations, { as: 'organization', foreignKey: 'organization_id' });
Organizations.hasMany(Admins, { as: 'admins', foreignKey: 'organization_id' });





module.exports = {
  Modules,
  SubCategories,
  Categories,
  Letters,
  Alerts,
  Countries,
  Cities,
  Organizations,
  Users,
  Admins,
};