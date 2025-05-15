const Specializations = require('../models/userModels/specializations');

const specializations = [
  { id: 1, name: 'First Aid', created_at: new Date(), updated_at: new Date() },
  { id: 2, name: 'Nutrition', created_at: new Date(), updated_at: new Date() },
  { id: 3, name: 'Infection Control', created_at: new Date(), updated_at: new Date() },
  { id: 4, name: 'Mental Health', created_at: new Date(), updated_at: new Date() },
];

const specializationsSeed = async () => {
  try {
    await Specializations.bulkCreate(specializations);
    console.log('Specializations seeded successfully!');
  } catch (err) {
    console.error('Error seeding specializations:', err);
  }
};

module.exports = specializationsSeed;
