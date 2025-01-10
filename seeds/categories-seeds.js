const Categories = require('../models/moduleModels/categories');

const categoriesData = [
    {
        name: 'Body Location/Systems',
    },
    {
        name: 'Demographic Groups',
    },
    {
        name: 'Diagnosis and Therapy',
    },
    {
        name: 'Disorders and Conditions',
    },
    {
        name: 'Health and Wellness',
    },
    {
        name: 'Language Translations',
    },
    {
        name: 'Special Series',
    },
];

const seedCategories = async () => {
    try {
        const count = await Categories.count(); 
        if (count === 0) {
            await Categories.bulkCreate(categoriesData);
            console.log('Categories seeded successfully!');
        } else {
            console.log('Categories table already has data, skipping seeding.');
        }
    } catch (error) {
        console.error('Error seeding categories:', error);
    }
};

module.exports = seedCategories;
