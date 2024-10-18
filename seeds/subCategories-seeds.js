const Categories = require('../models/categories');
const SubCategories = require('../models/subCategories');

const subCategoriesData = [
    {
        name: 'Blood, Heart and Circulation',
        category_id: 1,
    },
    {
        name: 'Bones, Joints and Muscles',
        category_id: 1,
    },
    {
        name: 'Brain and Nerves',
        category_id: 1,
    },
    {
        name: 'Digestive System',
        category_id: 1,
    },
    {
        name: 'Ear, Nose and Throat',
        category_id: 1,
    },
    {
        name: 'Endocrine System',
        category_id: 1,
    },
    {
        name: 'Eyes and Vision',
        category_id: 1,
    },
    {
        name: 'Immune System',
        category_id: 1,
    },
    {
        name: 'Kidneys and Urinary System',
        category_id: 1,
    },
    {
        name: 'Lungs and Breathing',
        category_id: 1,
    },
    {
        name: 'Mouth and Teeth',
        category_id: 1,
    },
    {
        name: 'Skin, Hair and Nails',
        category_id: 1,
    },
    {
        name: 'Female Reproductive System',
        category_id: 1,
    },
    {
        name: 'Male Reproductive System',
        category_id: 1,
    },
    {
        name: 'Children and Teenagers',
        category_id: 2,
    },
    {
        name: 'Men',
        category_id: 2,
    },
    {
        name: 'Population Groups',
        category_id: 2,
    },
    {
        name: 'Seniors',
        category_id: 2,
    },
    {
        name: 'Women',
        category_id: 2,
    },
    {
        name: 'Complementary and Alternative Therapies',
        category_id: 3,
    },
    {
        name: 'Diagnostic Tests',
        category_id: 3,
    },
    {
        name: 'Drug Therapy',
        category_id: 3,
    },
    {
        name: 'Surgery and Rehabilitation',
        category_id: 3,
    },
    {
        name: 'Symptoms',
        category_id: 3,
    },
    {
        name: 'Transplantation and Donation',
        category_id: 3,
    },
    {
        name: 'Cancers',
        category_id: 4,
    },
    {
        name: 'Diabetes Mellitus',
        category_id: 4,
    },
    {
        name: 'Genetics/Birth Defects',
        category_id: 4,
    },
    {
        name: 'Infections',
        category_id: 4,
    },
    {
        name: 'Injuries and Wounds',
        category_id: 4,
    },
    {
        name: 'Mental Health and Behavior',
        category_id: 4,
    },
    {
        name: 'Metabolic Problems',
        category_id: 4,
    },
    {
        name: 'Poisoning, Toxicology, Environmental Health',
        category_id: 4,
    },
    {
        name: 'Pregnancy and Reproduction',
        category_id: 4,
    },
    {
        name: 'Substance Abuse Problems',
        category_id: 4,
    },
    {
        name: 'Disasters',
        category_id: 5,
    },
    {
        name: 'Fitness and Exercise',
        category_id: 5,
    },
    {
        name: 'Food and Nutrition',
        category_id: 5,
    },
    {
        name: 'Health System',
        category_id: 5,
    },
    {
        name: 'Personal Health Issues',
        category_id: 5,
    },
    {
        name: 'Safety Issues',
        category_id: 5,
    },
    {
        name: 'Social/Family Issues',
        category_id: 5,
    },
    {
        name: 'Wellness and Lifestyle',
        category_id: 5,
    },
    {
        name: 'Armenian',
        category_id: 6,
    },
    {
        name: 'Kenya',
        category_id: 6,
    },
    {
        name: 'Mandarin',
        category_id: 6,
    },
    {
        name: 'Spanish',
        category_id: 6,
    },
    {
        name: 'Ukrainian',
        category_id: 6,
    },
    {
        name: 'The Coronavirus Threat: Key Topics in Infection Control (COVID-19 Module Series)',
        category_id: 7,
    },
    {
        name: 'Cancer',
        category_id: 7,
    },
    {
        name: 'Diabetes',
        category_id: 7,
    },
    {
        name: 'Express',
        category_id: 7,
    },
    {
        name: 'HIV/AIDS',
        category_id: 7,
    },
    {
        name: 'Infectious Diseases',
        category_id: 7,
    },
    {
        name: 'Mother and Child Health',
        category_id: 7,
    },
    {
        name: 'Women\'s Health Series',
        category_id: 7,
    },
    {
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
  