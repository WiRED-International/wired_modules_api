const Users = require('../models/userModels/users');
//password hashing occurs in the beforeCreate hook in the user model

const users = [
  {
    first_name: 'John',
    last_name: 'Doe',
    email: 'johndoe@example.com',
    password: 'password',
    role_id: 1,
    country_id: 1,
    city_id: 4,
    organization_id: 4,
  },
  {
    first_name: 'Jane',
    last_name: 'Doe',
    email: 'janedoe@example.com',
    password: 'password',
    role_id: 1,
    country_id: 1,
    city_id: 3,
    organization_id: 1,
  },
  {
    first_name: 'Bob',
    last_name: 'Doe',
    email: 'bobdoe@example.com',
    password: 'password',
    role_id: 1,
    country_id: 1,
    city_id: 3,
    organization_id: 1,
  },
  {
    first_name: 'Alice',
    last_name: 'Doe',
    email: 'alicedoe@example.com',
    password: 'password',
    role_id: 1,
    country_id: 1,
    city_id: 1,
    organization_id: 2,
  },
  {
    first_name: 'Charlie',
    last_name: 'Brown',
    email: 'charliebrown@example.com',
    password: 'password',
    role_id: 1,
    country_id: 1,
    city_id: 3,
    organization_id: 3,
  },
  {
    first_name: 'Harry',
    last_name: 'Potter',
    email: 'h.potter@example.com',
    password: 'password',
    role_id: 2,
    country_id: 1,
    city_id: 1,
    organization_id: 1,
  },
  {
    first_name: 'Hermione',
    last_name: 'Granger',
    email: 'h.granger@example.com',
    password: 'password',
    role_id: 2,
    country_id: 1,
    city_id: 3,
    organization_id: 1,
  },
  {
    first_name: 'Ron',
    last_name: 'Weasley',
    email: 'ronweasley@example.com',
    password: 'password',
    role_id: 2,
    country_id: 1,
    city_id: 3,
    organization_id: 1,
  },
  {
    first_name: 'Albus',
    last_name: 'Dumbledore',
    email: 'dumbledore@example.com',
    password: 'password',
    role_id: 3,
    country_id: 1,
    city_id: 3,
    organization_id: 1,
  },
  {
    first_name: 'Minerva',
    last_name: 'McGonagall',
    email: 'minerva@example.com',
    password: 'password',
    role_id: 3,
    country_id: 1,
    city_id: 1,
    organization_id: 1,
  },
  {
    first_name: "Michael",
    last_name: "Seaman",
    email: "mike1@mike.com",
    password: "password",
    role_id: 3,
    country_id: 2,
    city_id: 1,
    organization_id: 1,
  },
  {
    first_name: "Jenna",
    last_name: "Seaman",
    email: "jenna@jenna.com",
    password: "password",
    role_id: 1,
    country_id: null,
    city_id: null,
    organization_id: 1,
  },
  {
    first_name: "Dave",
    last_name: "West",
    email: "dave@dave.com",
    password: "password",
    role_id: 2,
    country_id: 1,
    city_id: 1,
    organization_id: 1,
  },
];

const usersSeed = async () => {
  try {

    await Users.bulkCreate(users, { individualHooks: true });
    console.log('Users seeded successfully!');
  } catch (err) {
    console.error('Error seeding users:', err);
  }
};

module.exports = usersSeed;