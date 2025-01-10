const Categories = require('../models/moduleModels/categories');
const SubCategories = require('../models/moduleModels/subCategories');

const subCategoriesData = [
    {
        // id: 1,
        name: 'Blood, Heart and Circulation',
        category_id: 1,
    },
    {
        // id: 2,
        name: 'Bones, Joints and Muscles',
        category_id: 1,
    },
    {
        // id: 3,
        name: 'Brain and Nerves',
        category_id: 1,
    },
    {
        // id: 4,
        name: 'Digestive System',
        category_id: 1,
    },
    {
        // id: 5,
        name: 'Ear, Nose and Throat',
        category_id: 1,
    },
    {
        // id: 6,
        name: 'Endocrine System',
        category_id: 1,
    },
    {
        // id: 7,
        name: 'Eyes and Vision',
        category_id: 1,
    },
    {
        // id: 8,
        name: 'Immune System',
        category_id: 1,
    },
    {
        // id: 9,
        name: 'Kidneys and Urinary System',
        category_id: 1,
    },
    {
        // id: 10,
        name: 'Lungs and Breathing',
        category_id: 1,
    },
    {
        // id: 11,
        name: 'Mouth and Teeth',
        category_id: 1,
    },
    {
        // id: 12,
        name: 'Skin, Hair and Nails',
        category_id: 1,
    },
    {
        // id: 13,
        name: 'Female Reproductive System',
        category_id: 1,
    },
    {
        // id: 14,
        name: 'Male Reproductive System',
        category_id: 1,
    },
    {
        // id: 15,
        name: 'Children and Teenagers',
        category_id: 2,
    },
    {
        // id: 16,
        name: 'Men',
        category_id: 2,
    },
    {
        // id: 17,
        name: 'Population Groups',
        category_id: 2,
    },
    {
        // id: 18,
        name: 'Seniors',
        category_id: 2,
    },
    {
        // id: 19,
        name: 'Women',
        category_id: 2,
    },
    {
        // id: 20,
        name: 'Complementary and Alternative Therapies',
        category_id: 3,
    },
    {
        // id: 21,
        name: 'Diagnostic Tests',
        category_id: 3,
    },
    {
        // id: 22,
        name: 'Drug Therapy',
        category_id: 3,
    },
    {
        // id: 23,
        name: 'Surgery and Rehabilitation',
        category_id: 3,
    },
    {
        // id: 24,
        name: 'Symptoms',
        category_id: 3,
    },
    {
        // id: 25,
        name: 'Transplantation and Donation',
        category_id: 3,
    },
    {
        // id: 26,
        name: 'Cancers',
        category_id: 4,
    },
    {
        // id: 27,
        name: 'Diabetes Mellitus',
        category_id: 4,
    },
    {
        // id: 28,
        name: 'Genetics/Birth Defects',
        category_id: 4,
    },
    {
        // id: 29,
        name: 'Infections',
        category_id: 4,
    },
    {
        // id: 30,
        name: 'Injuries and Wounds',
        category_id: 4,
    },
    {
        // id: 31,
        name: 'Mental Health and Behavior',
        category_id: 4,
    },
    {
        // id: 32,
        name: 'Metabolic Problems',
        category_id: 4,
    },
    {
        // id: 33,
        name: 'Poisoning, Toxicology, Environmental Health',
        category_id: 4,
    },
    {
        // id: 34,
        name: 'Pregnancy and Reproduction',
        category_id: 4,
    },
    {
        // id: 35,
        name: 'Substance Abuse Problems',
        category_id: 4,
    },
    {
        // id: 36,
        name: 'Disasters',
        category_id: 5,
    },
    {
        // id: 37,
        name: 'Fitness and Exercise',
        category_id: 5,
    },
    {
        // id: 38,
        name: 'Food and Nutrition',
        category_id: 5,
    },
    {
        // id: 39,
        name: 'Health System',
        category_id: 5,
    },
    {
        // id: 40,
        name: 'Personal Health Issues',
        category_id: 5,
    },
    {
        // id: 41,
        name: 'Safety Issues',
        category_id: 5,
    },
    {
        // id: 42,
        name: 'Social/Family Issues',
        category_id: 5,
    },
    {
        // id: 43,
        name: 'Wellness and Lifestyle',
        category_id: 5,
    },
    {
        // id: 44,
        name: 'Armenian',
        category_id: 6,
    },
    {
        // id: 45,
        name: 'Kenya',
        category_id: 6,
    },
    {
        // id: 46,
        name: 'Mandarin',
        category_id: 6,
    },
    {
        // id: 47,
        name: 'Spanish',
        category_id: 6,
    },
    {
        // id: 48,
        name: 'Ukrainian',
        category_id: 6,
    },
    {
        // id: 49,
        name: 'The Coronavirus Threat: Key Topics in Infection Control (COVID-19 Module Series)',
        category_id: 7,
    },
    {
        // id: 50,
        name: 'Cancer',
        category_id: 7,
    },
    {
        // id: 51,
        name: 'Diabetes',
        category_id: 7,
    },
    {
        // id: 52,
        name: 'Express',
        category_id: 7,
    },
    {
        // id: 53,
        name: 'HIV/AIDS',
        category_id: 7,
    },
    {
        // id: 54,
        name: 'Infectious Diseases',
        category_id: 7,
    },
    {
        // id: 55,
        name: 'Mother and Child Health',
        category_id: 7,
    },
    {
        // id: 56,
        name: 'Women\'s Health Series',
        category_id: 7,
    },
    {
        // id: 57,
        name: 'WiRED Special Material',
        category_id: 7,
    },
];

const seedSubCategories = async () => {
    try {
        // Verify that the referenced categories exist
        const categoriesCount = await Categories.count();
        if (categoriesCount === 0) {
            throw new Error('No categories found. SubCategories cannot be seeded.');
        }

        console.log('Checking if subCategories table is empty...');
        const count = await SubCategories.count();
        console.log(`SubCategories count: ${count}`);
        if (count === 0) {
            console.log('No subCategories found, seeding now...');
            await SubCategories.bulkCreate(subCategoriesData);
            console.log('SubCategories seeded successfully!');
        } else {
            console.log('SubCategories already exist, skipping seeding.');
        }
    } catch (error) {
        console.error('Error seeding subCategories:', error);
    }
};

module.exports = seedSubCategories;
  