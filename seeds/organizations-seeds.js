const Organizations = require('../models/userModels/organizations');

const organizations = [
  {
    name: 'Pandipieri',
    country_id: 1,
    city_id: 3,
  },
  {
    name: 'Highschool',
    country_id: 1,
    city_id: 1,
  },
  {
    name: 'Supermarket',
    country_id: 1,
    city_id: 3,
  },
  {
    name: 'Maseno University',
    country_id: 1,
    city_id: 4,
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