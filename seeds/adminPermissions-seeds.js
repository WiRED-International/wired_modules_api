const AdminPermissions = require('../models/userModels/adminPermissions');

const adminPermissions = [
  {
    admin_id: 6,
    country_id: 1,
    city_id: 3,
    organization_id: 1,
    role_id: 1,
  },
  {
    admin_id: 8,
    country_id: 2,
    city_id: 3,
    organization_id: 1,
    role_id: 1,
  },
];

const adminPermissionsSeed = async () => {
  try {
    await AdminPermissions.bulkCreate(adminPermissions);
    console.log('Admin permissions seeded successfully!');
  } catch (err) {
    console.error('Error seeding admin permissions:', err);
  }
};

module.exports = adminPermissionsSeed;