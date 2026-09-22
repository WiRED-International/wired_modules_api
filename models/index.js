const Modules = require('./moduleModels/modules');
const SubCategories = require('./moduleModels/subCategories');
const Categories = require('./moduleModels/categories');
const Letters = require('./moduleModels/letters');
const QuizScores = require('./moduleModels/quizScores');
const Downloads = require('./moduleModels/downloads');
const Packages = require('./moduleModels/packages');

const Countries = require('./userModels/countries');
const Cities = require('./userModels/cities');
const Locations = require('./userModels/locations');
const Organizations = require('./userModels/organizations');
const OrganizationCountries = require('./userModels/organizationCountries');
const Roles = require('./userModels/roles');
const Users = require('./userModels/users');
const AdminPermissions = require('./userModels/adminPermissions');
const Specializations = require('./userModels/specializations');
const CmeCertificates = require('./userModels/cmeCertificates');
const Credentials = require('./userModels/credentials');

const Exams = require('./examModels/exams');
const ExamQuestions = require('./examModels/examQuestions');
const ExamTemplates = require('./examModels/examTemplates');
const ExamTemplateQuestions = require('./examModels/examTemplateQuestions');
const ExamSessions = require('./examModels/examSessions');
const ExamUserAccess = require('./examModels/examUserAccess');

const Programs = require('./userModels/programs');
const Classes = require('./userModels/classes');
const ClassEnrollments = require('./userModels/classEnrollments');
const ClassEnrollmentSpecializations = require('./userModels/classEnrollmentSpecializations');

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
// 🎓 PROGRAMS & CLASSES
// ===============================

// Program -> Modules
Programs.belongsToMany(Modules, {
  as: 'modules',
  through: 'program_modules',
  foreignKey: 'program_id',
  otherKey: 'module_id',
});

Modules.belongsToMany(Programs, {
  as: 'programs',
  through: 'program_modules',
  foreignKey: 'module_id',
  otherKey: 'program_id',
});

// Program -> Classes
Programs.hasMany(Classes, {
  as: 'classes',
  foreignKey: 'program_id',
});

Classes.belongsTo(Programs, {
  as: 'program',
  foreignKey: 'program_id',
});

// Organization -> Classes
Organizations.hasMany(Classes, {
  as: 'classes',
  foreignKey: 'organization_id',
});

Classes.belongsTo(Organizations, {
  as: 'organization',
  foreignKey: 'organization_id',
});

// Location -> Classes
Locations.hasMany(Classes, {
  as: 'classes',
  foreignKey: 'location_id',
});

Classes.belongsTo(Locations, {
  as: 'location',
  foreignKey: 'location_id',
});

// User (creator) -> Classes
Users.hasMany(Classes, {
  as: 'created_classes',
  foreignKey: 'created_by_user_id',
});

Classes.belongsTo(Users, {
  as: 'created_by_user',
  foreignKey: 'created_by_user_id',
});

Users.belongsToMany(Classes, {
  through: ClassEnrollments,
  as: 'classes',
  foreignKey: 'user_id',
  otherKey: 'class_id',
});

Classes.belongsToMany(Users, {
  through: ClassEnrollments,
  as: 'students',
  foreignKey: 'class_id',
  otherKey: 'user_id',
});

Users.hasMany(ClassEnrollments, {
  as: 'class_enrollments',
  foreignKey: 'user_id',
});

ClassEnrollments.belongsTo(Users, {
  as: 'user',
  foreignKey: 'user_id',
});

Classes.hasMany(ClassEnrollments, {
  as: 'class_enrollments',
  foreignKey: 'class_id',
});

ClassEnrollments.belongsTo(Classes, {
  as: 'class',
  foreignKey: 'class_id',
});

// Class Enrollment -> Specialization Selection
ClassEnrollments.hasOne(ClassEnrollmentSpecializations, {
  as: 'specialization_selection',
  foreignKey: 'class_enrollment_id',
});

ClassEnrollmentSpecializations.belongsTo(ClassEnrollments, {
  as: 'class_enrollment',
  foreignKey: 'class_enrollment_id',
});

// Specialization -> Enrollment Selections
Specializations.hasMany(ClassEnrollmentSpecializations, {
  as: 'class_enrollment_specializations',
  foreignKey: 'specialization_id',
});

ClassEnrollmentSpecializations.belongsTo(Specializations, {
  as: 'specialization',
  foreignKey: 'specialization_id',
});

// ===============================
// 🎓 WIRED CREDENTIALS
// ===============================

Users.hasMany(Credentials, {
  as: 'credentials',
  foreignKey: 'user_id',
});

Credentials.belongsTo(Users, {
  as: 'user',
  foreignKey: 'user_id',
});

Classes.hasMany(Credentials, {
  as: 'credentials',
  foreignKey: 'class_id',
});

Credentials.belongsTo(Classes, {
  as: 'class',
  foreignKey: 'class_id',
});

Programs.hasMany(Credentials, {
  as: 'credentials',
  foreignKey: 'program_id',
});

Credentials.belongsTo(Programs, {
  as: 'program',
  foreignKey: 'program_id',
});

Specializations.hasMany(Credentials, {
  as: 'credentials',
  foreignKey: 'specialization_id',
});

Credentials.belongsTo(Specializations, {
  as: 'specialization',
  foreignKey: 'specialization_id',
});

ExamSessions.hasMany(Credentials, {
  as: 'credentials',
  foreignKey: 'exam_session_id',
});

Credentials.belongsTo(ExamSessions, {
  as: 'exam_session',
  foreignKey: 'exam_session_id',
});

Credentials.belongsTo(Users, {
  as: 'revoked_by_user',
  foreignKey: 'revoked_by_user_id',
});

// ===============================
// 🧾 CME CERTIFICATES
// ===============================
Users.hasMany(CmeCertificates, {
  as: 'cme_certificates',
  foreignKey: 'user_id',
});

CmeCertificates.belongsTo(Users, {
  as: 'user',
  foreignKey: 'user_id',
});

// ===============================
// 🧮 EXAM-RELATED ASSOCIATIONS
// ===============================
Exams.hasMany(ExamQuestions, {  as: 'exam_questions', foreignKey: 'exam_id' });
ExamQuestions.belongsTo(Exams, { as: 'exams', foreignKey: 'exam_id' });

Exams.hasMany(ExamSessions, { as: 'exam_sessions', foreignKey: 'exam_id' });
ExamSessions.belongsTo(Exams, { as: 'exams', foreignKey: 'exam_id' });

// Exam Session -> Class
ExamSessions.belongsTo(Classes, { as: 'class', foreignKey: 'class_id' });

Classes.hasMany(ExamSessions, { as: 'exam_sessions', foreignKey: 'class_id' });

Exams.hasMany(ExamUserAccess, { as: 'exam_user_access', foreignKey: 'exam_id' });
ExamUserAccess.belongsTo(Exams, { as: 'exams', foreignKey: 'exam_id' });

Users.hasMany(ExamUserAccess, { as: 'exam_user_access', foreignKey: 'user_id' });
ExamUserAccess.belongsTo(Users, { as: 'users', foreignKey: 'user_id' });

ExamUserAccess.belongsTo(Users, { as: 'granted_by_user', foreignKey: 'granted_by' });

Exams.belongsToMany(Organizations, { as: 'organizations', through: 'exam_organization', foreignKey: 'exam_id', otherKey: 'organization_id', });

// Exam -> Classes
Exams.belongsToMany(Classes, { as: 'classes', through: 'exam_class', foreignKey: 'exam_id', otherKey: 'class_id', });


// Class -> Exams
Classes.belongsToMany(Exams, { as: 'exams', through: 'exam_class', foreignKey: 'class_id', otherKey: 'exam_id', });

// ===============================
// 🧠 EXAM TEMPLATE ASSOCIATIONS
// ===============================

// Exam Template → Template Questions
ExamTemplates.hasMany(ExamTemplateQuestions, {
  as: 'exam_template_questions',
  foreignKey: 'exam_template_id'
});

ExamTemplateQuestions.belongsTo(ExamTemplates, {
  as: 'exam_template',
  foreignKey: 'exam_template_id'
});

// Exam Template → Exams
ExamTemplates.hasMany(Exams, {
  as: 'exams',
  foreignKey: 'exam_template_id'
});

Exams.belongsTo(ExamTemplates, {
  as: 'exam_template',
  foreignKey: 'exam_template_id'
});

// ===============================
// 📘 MODULE-RELATED ASSOCIATIONS
// ===============================
Modules.belongsTo(Modules, { as: 'RedirectedModule', foreignKey: 'redirect_module_id' });

Modules.belongsToMany(SubCategories, { as: 'subCategories', through: 'module_subcategory', foreignKey: 'module_id' });
SubCategories.belongsToMany(Modules, { as: 'modules', through: 'module_subcategory', foreignKey: 'subcategory_id' });

Modules.belongsToMany(Letters, { as: 'letters', through: 'module_letter', foreignKey: 'module_id' });
Letters.belongsToMany(Modules, { as: 'modules', through: 'module_letter', foreignKey: 'letter_id' });

Modules.belongsToMany(Specializations, {
  as: 'specializations',
  through: 'module_specializations',
  foreignKey: 'module_id',
  otherKey: 'specialization_id',
});

Specializations.belongsToMany(Modules, {
  as: 'modules',
  through: 'module_specializations',
  foreignKey: 'specialization_id',
  otherKey: 'module_id',
});

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

// Country -> Locations
Countries.hasMany(Locations, {
  as: 'locations',
  foreignKey: 'country_id',
});

Locations.belongsTo(Countries, {
  as: 'country',
  foreignKey: 'country_id',
});

// Location hierarchy
Locations.hasMany(Locations, {
  as: 'child_locations',
  foreignKey: 'parent_location_id',
});

Locations.belongsTo(Locations, {
  as: 'parent_location',
  foreignKey: 'parent_location_id',
});

Countries.hasMany(Cities, { as: 'cities', foreignKey: 'country_id' });
Cities.belongsTo(Countries, { as: 'country', foreignKey: 'country_id' });

Countries.belongsToMany(Organizations, {
  through: OrganizationCountries,
  foreignKey: 'country_id',
  otherKey: 'organization_id',
  as: 'organizations',
});

Organizations.belongsToMany(Countries, {
  through: OrganizationCountries,
  foreignKey: 'organization_id',
  otherKey: 'country_id',
  as: 'countries',
});

Cities.hasMany(Organizations, { as: 'organizations', foreignKey: 'city_id' });
Organizations.belongsTo(Cities, { as: 'cities', foreignKey: 'city_id' });

Organizations.belongsToMany(Exams, { as: 'exams', through: 'exam_organization', foreignKey: 'organization_id', otherKey: 'exam_id', });

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
  Locations,
  Organizations,
  OrganizationCountries,
  Roles,
  Users,
  AdminPermissions,
  Downloads,
  Packages,
  Specializations,
  Exams,
  ExamQuestions,
  ExamTemplates,
  ExamTemplateQuestions,
  ExamSessions,
  ExamUserAccess,
  CmeCertificates,
  Credentials,
  Programs,
  Classes,
  ClassEnrollments,
  ClassEnrollmentSpecializations,
};