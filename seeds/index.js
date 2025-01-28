const sequelize = require('../config/connection');
const seedCategories = require('./categories-seeds');
const seedSubCategories = require('./subCategories-seeds');
const seedModules = require('./modules-seeds');
const seedPackages = require('./packages-seeds');
const seedAlerts = require('./alerts-seeds');
const seedLetters = require('./letters-seeds');
const seedCountries = require('./countries-seeds');
const seedCities = require('./cities-seeds');
const seedOrganizations = require('./organizations-seeds');
const seedRoles = require('./roles-seeds');
const seedUsers = require('./users-seeds');
const seedAdminPermissions = require('./adminPermissions-seeds');
const seedDownloads = require('./downloads-seeds')
const seedQuizScores = require('./quizScores-seeds');



const seed = async () => {
    try {
        console.log('Connecting to the database...');
        await sequelize.authenticate(); // Check the connection to the database
        console.log('Database connection successful.');

        console.log('Syncing tables...');
        await sequelize.sync({ alter: true }); // Sync the database without dropping tables
        console.log('Tables synced successfully.');

        console.log('Seeding categories...');
        await seedCategories(); // Seed categories
        console.log('Categories seeded.');

        console.log('Seeding subCategories...');
        await seedSubCategories(); // Seed subCategories
        console.log('SubCategories seeded.');

        console.log('Seeding modules...');
        await seedModules(); // Seed modules
        console.log('Modules seeded.');

        console.log('Seeding packages...');
        await seedPackages(); // Seed packages
        console.log('Packages seeded.');

        console.log('Seeding alerts...');
        await seedAlerts(); // Seed alerts
        console.log('Alerts seeded.');

        console.log('Seeding letters...');
        await seedLetters(); // Seed letters
        console.log('Letters seeded.');

        console.log('Seeding countries...');
        await seedCountries(); // Seed countries
        console.log('Countries seeded.');

        console.log('Seeding cities...');
        await seedCities(); // Seed cities
        console.log('Cities seeded.');

        console.log('Seeding organizations...');
        await seedOrganizations(); // Seed organizations
        console.log('Organizations seeded.');

        console.log('Seeding roles...');
        await seedRoles(); // Seed roles
        console.log('Roles seeded.');

        console.log('Seeding users...');
        await seedUsers(); // Seed users
        console.log('Users seeded.');

        console.log('Seeding admin permissions...');
        await seedAdminPermissions(); // Seed admin permissions
        console.log('Admin permissions seeded.');

        console.log('Seeding downloads...');
        await seedDownloads(); // Seed downloads
        console.log('Downloads seeded.');

        console.log('Seeding quiz scores...');
        await seedQuizScores(); // Seed quiz scores
        console.log('Quiz scores seeded.');
  
        console.log('Seeding completed successfully.');

    } catch (error) {
        console.error('Error during seeding process:', error); // Log errors
    }
};

// Run the seed script
seed();
//module.exports = seed;