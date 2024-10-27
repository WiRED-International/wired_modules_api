const sequelize = require('../config/connection');
const seedCategories = require('./categories-seeds');
const seedSubCategories = require('./subCategories-seeds');
const seedModules = require('./modules-seeds');
const seedPackages = require('./packages-seeds');
const seedAlerts = require('./alerts-seeds');

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

        console.log('Seeding completed successfully.');

    } catch (error) {
        console.error('Error during seeding process:', error); // Log errors
    }
};

// Run the seed script
seed();
//module.exports = seed;