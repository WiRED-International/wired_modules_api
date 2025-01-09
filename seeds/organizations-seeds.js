const Organizations = require('../models/organizations');

const organizations = [
  {
    name: 'Pandipieri',
    country_id: 1,
    city_id: 1,
  },
];

const organizationsSeed = async () => {
  try {
    await Organizations.bulkCreate(organizations);
    console.log('Organizations seeded successfully!');
  } catch (err) {
    console.error('Error seeding organizations:', err);
  }
};

module.exports = organizationsSeed;