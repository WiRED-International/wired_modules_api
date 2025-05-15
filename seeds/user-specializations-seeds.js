const sequelize = require('../config/connection');

const userSpecializations = [];
const userIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
const specializationIds = [1, 2, 3, 4];

userIds.forEach(userId => {
  const numBadges = Math.floor(Math.random() * 3) + 1;
  const assigned = new Set();

  while (assigned.size < numBadges) {
    const randomBadge = specializationIds[Math.floor(Math.random() * specializationIds.length)];
    if (!assigned.has(randomBadge)) {
      assigned.add(randomBadge);
      userSpecializations.push({
        user_id: userId,
        specialization_id: randomBadge,
        date_awarded: new Date(),
      });
    }
  }
});

const seedUserSpecializations = async () => {
  try {
    const queryInterface = sequelize.getQueryInterface();

    await queryInterface.bulkInsert('user_specializations', userSpecializations);
    console.log('✅ User specializations seeded successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding user specializations:', err);
    process.exit(1);
  }
};

seedUserSpecializations();