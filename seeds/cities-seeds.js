const Cities = require('../models/userModels/cities');

const cities = [
  {
    name: 'Nairobi',
    country_id: 1,
  },
  {
    name: 'Mombasa',
    country_id: 1,
  },
  {
    name: 'Kisumu',
    country_id: 1,
  },
  {
    name: 'Maseno',
    country_id: 2,
  },
];

const citiesSeed = async () => {
  try {
    await Cities.bulkCreate(cities);
    console.log('Cities seeded successfully!');
  } catch (err) {
    console.error('Error seeding cities:', err);
  }
};

module.exports = citiesSeed;