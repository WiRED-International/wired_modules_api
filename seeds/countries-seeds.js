const Countries = require('../models/userModels/countries');

//get data from countryNames.json
const countries = require('../utils/countryNames.json'); 

const countriesSeed = async () => {
  try {
    await Countries.bulkCreate(countries);
    console.log('Countries seeded successfully!');
  } catch (err) {
    console.error('Error seeding countries:', err);
  }
};

module.exports = countriesSeed;