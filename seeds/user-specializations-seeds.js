// const sequelize = require('../config/connection');

// const userSpecializations = [];
// const userIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
// const specializationIds = [1, 2, 3, 4];

// userIds.forEach(userId => {
//   const numBadges = Math.floor(Math.random() * 3) + 1;
//   const assigned = new Set();

//   while (assigned.size < numBadges) {
//     const randomBadge = specializationIds[Math.floor(Math.random() * specializationIds.length)];
//     if (!assigned.has(randomBadge)) {
//       assigned.add(randomBadge);
//       userSpecializations.push({
//         user_id: userId,
//         specialization_id: randomBadge,
//         created_at: new Date(),
//         updated_at: new Date(),
//       });
//     }
//   }
// });

// const seedUserSpecializations = async () => {
//   try {
//     const queryInterface = sequelize.getQueryInterface();

//     await queryInterface.bulkInsert('user_specializations', userSpecializations);
//     console.log('✅ User specializations seeded successfully!');
//     process.exit(0);
//   } catch (err) {
//     console.error('Error seeding user specializations:', err);
//     process.exit(1);
//   }
// };

// seedUserSpecializations();

const { Users, Specializations } = require('../models');
const sequelize = require('../config/connection');

const seedUserSpecializations = async () => {
  try {
    await sequelize.getQueryInterface().bulkDelete('user_specializations', null, {});

    await sequelize.authenticate();
    console.log('📦 Seeding user_specializations...');

    const users = await Users.findAll();
    const specializations = await Specializations.findAll();

    if (!users.length || !specializations.length) {
      throw new Error('❌ No users or specializations found. Did you seed them first?');
    }

    const pivotEntries = [];

    users.forEach(user => {
      const randomSpecs = specializations
        .sort(() => 0.5 - Math.random())
        .slice(0, 2); // 2 random specs per user

      randomSpecs.forEach(spec => {
        pivotEntries.push({
          user_id: user.id,
          specialization_id: spec.id,
          created_at: new Date(),
          updated_at: new Date()
        });
      });
    });

    await sequelize.getQueryInterface().bulkInsert('user_specializations', pivotEntries);

    console.log('✅ user_specializations seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding user_specializations:', error);
  } finally {
    // await sequelize.close();
  }
};

seedUserSpecializations();