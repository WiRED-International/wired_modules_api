const Roles = require('../models/userModels/roles');

const roles = [
  {
    name: 'user',
  },
  {
    name: 'admin',
  },
  {
    name: 'super_admin',
  },
];

const rolesSeed = async () => {
  try {
    await Roles.bulkCreate(roles);
    console.log('Roles seeded successfully!');
  } catch (err) {
    console.error('Error seeding roles:', err);
  }
};  

module.exports = rolesSeed;