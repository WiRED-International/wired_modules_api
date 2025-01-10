const Countries = require('../models/userModels/countries');

const countries = [
  {
    name: 'Kenya',
  },
  {
    name: 'Nigeria',
  },
  {
    name: 'Liberia',
  },
  {
    name: 'Armenia',
  },
];

const countriesSeed = async () => {
  try {
    await Countries.bulkCreate(countries);
    console.log('Countries seeded successfully!');
  } catch (err) {
    console.error('Error seeding countries:', err);
  }
};

module.exports = countriesSeed;