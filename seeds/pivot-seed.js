const { Modules, SubCategories } = require('../models');

// Seed the many to many relationship between modules and subCategories
const seedPivotTable = async () => { 
    try {
        // Blood, Heart, Circulation
        const blood_heart_circulation_1 = await SubCategories.findByPk(1);
        // Anatomy and Illness Fundamentals—Part 1 (Express module)
        const anatomy_and_illness_fundamentals_20 = await Modules.findByPk(20);
        await anatomy_and_illness_fundamentals_20.addSubCategory([blood_heart_circulation_1]);
        // Anemia
        const anemia_26 = await Modules.findByPk(26);
        await anemia_26.addSubCategory([blood_heart_circulation_1]);



        const module_5 = await Modules.findByPk(5);
        const subcategory_10 = await SubCategories.findByPk(10);
        await module_5.addSubCategory([subcategory_10]);
        console.log('Pivot table seeded successfully!');
    } catch (error) {
        console.error('Error seeding pivot table:', error); 
    }
 };

 seedPivotTable();