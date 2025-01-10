const Users = require('../models/userModels/users');
const bcrypt = require('bcryptjs');

const users = [
  {
    first_name: 'John',
    last_name: 'Doe',
    email: 'johndoe@example.com',
    password: 'password',
    role: 'user',
    country_id: 1,
    city_id: 4,
    organization_id: 4,
  },
  {
    first_name: 'Jane',
    last_name: 'Doe',
    email: 'janedoe@example.com',
    password: 'password',
    role: 'user',
    country_id: 1,
    city_id: 3,
    organization_id: 1,
  },
  {
    first_name: 'Bob',
    last_name: 'Doe',
    email: 'bobdoe@example.com',
    password: 'password',
    role: 'user',
    country_id: 1,
    city_id: 3,
    organization_id: 1,
  },
  {
    first_name: 'Alice',
    last_name: 'Doe',
    email: 'alicedoe@example.com',
    password: 'password',
    role: 'user',
    country_id: 1,
    city_id: 1,
    organization_id: 2,
  },
  {
    first_name: 'Charlie',
    last_name: 'Brown',
    email: 'charliebrown@example.com',
    password: 'password',
    role: 'user',
    country_id: 1,
    city_id: 3,
    organization_id: 3,
  },
  {
    first_name: 'Harry',
    last_name: 'Potter',
    email: 'h.potter@example.com',
    password: 'password',
    role: 'admin',
    country_id: 1,
    city_id: 1,
    organization_id: 1,
  },
];

const usersSeed = async () => {
  try {
    // Hash passwords for all users
    const hashedUsers = await Promise.all(
      users.map(async (user) => {
        const hashedPassword = await bcrypt.hash(user.password, 10); // Salt rounds set to 10
        return { ...user, password: hashedPassword };
      })
    );

    // Seed users with hashed passwords
    await Users.bulkCreate(hashedUsers);
    console.log('Users seeded successfully!');
  } catch (err) {
    console.error('Error seeding users:', err);
  }
};

module.exports = usersSeed;