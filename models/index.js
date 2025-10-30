const Modules = require('./moduleModels/modules');
const SubCategories = require('./moduleModels/subCategories');
const Categories = require('./moduleModels/categories');
const Letters = require('./moduleModels/letters');
const QuizScores = require('./moduleModels/quizScores');
const Downloads = require('./moduleModels/downloads');
const Packages = require('./moduleModels/packages');

const Countries = require('./userModels/countries');
const Cities = require('./userModels/cities');
const Organizations = require('./userModels/organizations');
const Roles = require('./userModels/roles');
const Users = require('./userModels/users');
const AdminPermissions = require('./userModels/adminPermissions');
const Specializations = require('./userModels/specializations');

const Exams = require('./examModels/exams');
const ExamQuestions = require('./examModels/examQuestions');
const ExamSessions = require('./examModels/examSessions');
const ExamUserAccess = require('./examModels/examUserAccess');

const Alerts = require('./alerts');

// ===============================
// 🧩 USER-RELATED ASSOCIATIONS
// ===============================
Users.hasMany(QuizScores, { as: 'quizScores', foreignKey: 'user_id' });
QuizScores.belongsTo(Users, { as: 'user', foreignKey: 'user_id' });

Users.belongsTo(Countries, { as: 'country', foreignKey: 'country_id' });
Countries.hasMany(Users, { as: 'users', foreignKey: 'country_id' });

Users.belongsTo(Cities, { as: 'city', foreignKey: 'city_id' });
Cities.hasMany(Users, { as: 'users', foreignKey: 'city_id' });

Users.belongsTo(Organizations, { as: 'organization', foreignKey: 'organization_id' });
Organizations.hasMany(Users, { as: 'users', foreignKey: 'organization_id' });

Users.belongsTo(Roles, { as: 'role', foreignKey: 'role_id' });
Roles.hasMany(Users, { as: 'users', foreignKey: 'role_id' });

Users.belongsToMany(Specializations, { as: 'specializations', through: 'user_specializations', foreignKey: 'user_id' });
Specializations.belongsToMany(Users, { as: 'users', through: 'user_specializations', foreignKey: 'specialization_id' });

Users.hasMany(ExamSessions, { as: 'exam_sessions', foreignKey: 'user_id' });
ExamSessions.belongsTo(Users, { as: 'users', foreignKey: 'user_id' });

// ===============================
// 🧮 EXAM-RELATED ASSOCIATIONS
// ===============================
Exams.hasMany(ExamQuestions, {  as: 'exam_questions', foreignKey: 'exam_id' });
ExamQuestions.belongsTo(Exams, { as: 'exams', foreignKey: 'exam_id' });

Exams.hasMany(ExamSessions, { as: 'exam_sessions', foreignKey: 'exam_id' });
ExamSessions.belongsTo(Exams, { as: 'exams', foreignKey: 'exam_id' });

Exams.hasMany(ExamUserAccess, { as: 'exam_user_access', foreignKey: 'exam_id' });
ExamUserAccess.belongsTo(Exams, { as: 'exams', foreignKey: 'exam_id' });

Users.hasMany(ExamUserAccess, { as: 'exam_user_access', foreignKey: 'user_id' });
ExamUserAccess.belongsTo(Users, { as: 'users', foreignKey: 'user_id' });

// ===============================
// 📘 MODULE-RELATED ASSOCIATIONS
// ===============================
Modules.belongsTo(Modules, { as: 'RedirectedModule', foreignKey: 'redirect_module_id' });

Modules.belongsToMany(SubCategories, { as: 'subCategories', through: 'module_subcategory', foreignKey: 'module_id' });
SubCategories.belongsToMany(Modules, { as: 'modules', through: 'module_subcategory', foreignKey: 'subcategory_id' });

Modules.belongsToMany(Letters, { as: 'letters', through: 'module_letter', foreignKey: 'module_id' });
Letters.belongsToMany(Modules, { as: 'modules', through: 'module_letter', foreignKey: 'letter_id' });

Modules.hasMany(QuizScores, { as: 'quizScores', foreignKey: 'module_id' });
QuizScores.belongsTo(Modules, { as: 'module', foreignKey: 'module_id' });

// ===============================
// 🗂️ SUBCATEGORY & CATEGORY
// ===============================
Categories.hasMany(SubCategories, { as: 'subCategories', foreignKey: 'category_id' });
SubCategories.belongsTo(Categories, { as: 'category', foreignKey: 'category_id' });

// ===============================
// 🔐 ADMIN-RELATED ASSOCIATIONS
// ===============================
AdminPermissions.belongsTo(Users, { as: 'admin', foreignKey: 'admin_id' });
Users.hasMany(AdminPermissions, { as: 'admin_permissions', foreignKey: 'admin_id' });

AdminPermissions.belongsTo(Countries, { as: 'country', foreignKey: 'country_id' });
AdminPermissions.belongsTo(Cities, { as: 'city', foreignKey: 'city_id' });
AdminPermissions.belongsTo(Organizations, { as: 'organization', foreignKey: 'organization_id' });
AdminPermissions.belongsTo(Roles, { as: 'role', foreignKey: 'role_id' });

// ===============================
// 🌍 COUNTRY-CITY-ORG RELATIONSHIPS
// ===============================
Countries.hasMany(Cities, { as: 'cities', foreignKey: 'country_id' });
Cities.belongsTo(Countries, { as: 'country', foreignKey: 'country_id' });

Countries.hasMany(Organizations, { as: 'organizations', foreignKey: 'country_id' });
Organizations.belongsTo(Countries, { as: 'country', foreignKey: 'country_id' });

Cities.hasMany(Organizations, { as: 'organizations', foreignKey: 'city_id' });
Organizations.belongsTo(Cities, { as: 'cities', foreignKey: 'city_id' });

// ===============================
// 💾 DOWNLOADS
// ===============================
Modules.hasMany(Downloads, { as: 'downloads', foreignKey: 'module_id' });
Downloads.belongsTo(Modules, { as: 'module', foreignKey: 'module_id' });

Packages.hasMany(Downloads, { as: 'downloads', foreignKey: 'package_id' });
Downloads.belongsTo(Packages, { as: 'package', foreignKey: 'package_id' });

Users.hasMany(Downloads, { as: 'downloads', foreignKey: 'user_id' });
Downloads.belongsTo(Users, { as: 'user', foreignKey: 'user_id' });

Downloads.belongsTo(Countries, { as: 'country', foreignKey: 'country_id' });

module.exports = {
  QuizScores,
  Modules,
  SubCategories,
  Categories,
  Letters,
  Alerts,
  Countries,
  Cities,
  Organizations,
  Roles,
  Users,
  AdminPermissions,
  Downloads,
  Packages,
  Specializations,
  Exams,
  ExamQuestions,
  ExamSessions,
  ExamUserAccess,
};