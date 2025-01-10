const Modules = require('./moduleModels/modules');
const SubCategories = require('./moduleModels/subCategories');
const Categories = require('./moduleModels/categories');
const Letters = require('./moduleModels/letters');
const Alerts = require('./alerts');
const Countries = require('./userModels/countries');
const Cities = require('./userModels/cities');
const Organizations = require('./userModels/organizations');
const Users = require('./userModels/users');
const AdminPermissions = require('./userModels/adminPermissions');

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

Countries.hasMany(Cities, { as: 'cities', foreignKey: 'country_id' });
Cities.belongsTo(Countries, { as: 'country', foreignKey: 'country_id' });

Countries.hasMany(Organizations, { as: 'organizations', foreignKey: 'country_id' });
Organizations.belongsTo(Countries, { as: 'country', foreignKey: 'country_id' });

Cities.hasMany(Organizations, { as: 'organizations', foreignKey: 'city_id' });
Organizations.belongsTo(Cities, { as: 'cities', foreignKey: 'city_id' });

AdminPermissions.belongsTo(Users, { as: 'admin', foreignKey: 'admin_id' });
Users.hasMany(AdminPermissions, { as: 'admin_permissions', foreignKey: 'admin_id' });

AdminPermissions.belongsTo(Countries, { as: 'country', foreignKey: 'country_id' });

AdminPermissions.belongsTo(Cities, { as: 'city', foreignKey: 'city_id' });

AdminPermissions.belongsTo(Organizations, { as: 'organization', foreignKey: 'organization_id' });


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
  AdminPermissions,
};