const Cities = require('../models/cities');

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