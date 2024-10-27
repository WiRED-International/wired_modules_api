const  Packages  = require('../models/packages');

const packagesData = [
    {
        //id: 1,
        name: 'Package 1',
        description: 'Package 1 description',
        letters: 'P',
        version: '1.0.0',
        downloadLink: 'https://example.com/module1.zip',
        packageSize: null,
    },
    {
        //id: 2,
        name: 'Package 2',
        description: 'Package 2 description',
        letters: 'P',
        version: '1.0.0',
        downloadLink: 'https://example.com/module1.zip',
        packageSize: null,
    },
    {
        //id: 3,
        name: 'Package 3',
        description: 'Package 3 description',
        letters: 'P',
        version: '1.0.0',
        downloadLink: 'https://example.com/module1.zip',
        packageSize: null,
    },
];

const seedPackages = async () => {
    try {
        const count = await Packages.count(); 
        if (count === 0) {
            await Packages.bulkCreate(packagesData);
            console.log('Packages seeded successfully!');
        } else {
            console.log('Packages table already has data, skipping seeding.');
        }
    } catch (error) {
        console.error('Error seeding packages:', error);
    }
};

module.exports = seedPackages;