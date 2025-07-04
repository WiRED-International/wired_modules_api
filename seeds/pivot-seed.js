const { Modules, SubCategories, Letters, Users, Specializations } = require('../models');
const sequelize = require('../config/connection');

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

        // Letters and Modules
        
        const A = await Letters.findByPk(1);
        const B = await Letters.findByPk(2);
        const C = await Letters.findByPk(3);
        const D = await Letters.findByPk(4);
        const E = await Letters.findByPk(5);
        const F = await Letters.findByPk(6);
        const G = await Letters.findByPk(7);
        const H = await Letters.findByPk(8);
        const I = await Letters.findByPk(9);
        const J = await Letters.findByPk(10);
        const K = await Letters.findByPk(11);
        const L = await Letters.findByPk(12);
        const M = await Letters.findByPk(13);
        const N = await Letters.findByPk(14);
        const O = await Letters.findByPk(15);
        const P = await Letters.findByPk(16);
        const Q = await Letters.findByPk(17);
        const R = await Letters.findByPk(18);
        const S = await Letters.findByPk(19);
        const T = await Letters.findByPk(20);
        const U = await Letters.findByPk(21);
        const V = await Letters.findByPk(22);
        const W = await Letters.findByPk(23);
        const X = await Letters.findByPk(24);
        const Y = await Letters.findByPk(25);
        const Z = await Letters.findByPk(26);
        const Womens_Health_Skin_and_hair_health = await Modules.findByPk(1);
        await Womens_Health_Skin_and_hair_health.addLetters([W]);
        const Acne = await Modules.findByPk(2);
        await Acne.addLetters([A]);
        const HIV_AIDS_Caregiver = await Modules.findByPk(3);
        await HIV_AIDS_Caregiver.addLetters([H]);
        const Acquired_Immune_Disease = await Modules.findByPk(4);
        await Acquired_Immune_Disease.addLetters([A]);
        const Bronchitis = await Modules.findByPk(5);
        await Bronchitis.addLetters([B]);
        const Acute_Bronchitis = await Modules.findByPk(6);
        await Acute_Bronchitis.addLetters([A]);
        const Upper_respiratory_tract_infection = await Modules.findByPk(7);
        await Upper_respiratory_tract_infection.addLetters([U]);
        const Adenoidectomy = await Modules.findByPk(8);
        await Adenoidectomy.addLetters([A]);
        const Adenoids = await Modules.findByPk(9);
        await Adenoids.addLetters([A]);
        const Seminar_in_attention_deficit_hyperactivity_disorder = await Modules.findByPk(10);
        await Seminar_in_attention_deficit_hyperactivity_disorder.addLetters([S]);
        const ADHD = await Modules.findByPk(11);
        await ADHD.addLetters([A]);
        const HIV_AIDS_Basic_information = await Modules.findByPk(12);
        await HIV_AIDS_Basic_information.addLetters([H]);
        const AIDS = await Modules.findByPk(13);
        await AIDS.addLetters([A]);
        const Air_Pollution = await Modules.findByPk(14);
        await Air_Pollution.addLetters([A]);
        const Airborne_Diseases = await Modules.findByPk(15);
        await Airborne_Diseases.addLetters([A]);
        const Alcohol_Quitting_Alcohol_for_Health = await Modules.findByPk(16);
        await Alcohol_Quitting_Alcohol_for_Health.addLetters([A]);
        const Upper_respiratory_tract_infections = await Modules.findByPk(17);
        await Upper_respiratory_tract_infections.addLetters([U]);
        const Allergy = await Modules.findByPk(18);
        await Allergy.addLetters([A]);
        const Alzheimers_disease = await Modules.findByPk(19);
        await Alzheimers_disease.addLetters([A]);
        const Anatomy_and_Illness_Fundamentals_Part_1 = await Modules.findByPk(20);
        await Anatomy_and_Illness_Fundamentals_Part_1.addLetters([A]);
        const Anatomy_and_Illness_Fundamentals_Part_2 = await Modules.findByPk(21);
        await Anatomy_and_Illness_Fundamentals_Part_2.addLetters([A]);
        const Anatomy_and_Illness_Fundamentals_Part_3 = await Modules.findByPk(22);
        await Anatomy_and_Illness_Fundamentals_Part_3.addLetters([A]);
        const Anatomical_Illness_Fundamentals_Part_1 = await Modules.findByPk(23);
        await Anatomical_Illness_Fundamentals_Part_1.addLetters([A]);
        const Anatomical_Illness_Fundamentals_Part_2 = await Modules.findByPk(24);
        await Anatomical_Illness_Fundamentals_Part_2.addLetters([A]);
        const Anatomical_Illness_Fundamentals_Part_3 = await Modules.findByPk(25);
        await Anatomical_Illness_Fundamentals_Part_3.addLetters([A]);
        const Anemia = await Modules.findByPk(26);
        await Anemia.addLetters([A]);
        const Sickle_Cell_Disease = await Modules.findByPk(27);
        await Sickle_Cell_Disease.addLetters([S]);
        const Anemia_Sickle_Cell = await Modules.findByPk(28);
        await Anemia_Sickle_Cell.addLetters([A]);
        const Mental_Health_Depression = await Modules.findByPk(29);
        await Mental_Health_Depression.addLetters([M]);
        const Antidepressants = await Modules.findByPk(30);
        await Antidepressants.addLetters([A]);
        const High_blood_pressure = await Modules.findByPk(31);
        await High_blood_pressure.addLetters([H]);
        const Antihypertensive_Medicines = await Modules.findByPk(32);
        await Antihypertensive_Medicines.addLetters([A]);
        const Antiretroviral_therapy_for_adults_and_children = await Modules.findByPk(33);
        await Antiretroviral_therapy_for_adults_and_children.addLetters([A]);
        const Seminar_in_anxiety_disorders = await Modules.findByPk(34);
        await Seminar_in_anxiety_disorders.addLetters([S]);
        const Anxiety = await Modules.findByPk(35);
        await Anxiety.addLetters([A]);
        const Rheumatic_Heart_Disease_Training_Series = await Modules.findByPk(36);
        await Rheumatic_Heart_Disease_Training_Series.addLetters([R]);
        const Aortic_Stenosis = await Modules.findByPk(37);
        await Aortic_Stenosis.addLetters([A]);
        const Meningitis = await Modules.findByPk(38);
        await Meningitis.addLetters([M]);
        const Arachnoiditis = await Modules.findByPk(39);
        await Arachnoiditis.addLetters([A]);
        const Arthritis = await Modules.findByPk(40);
        await Arthritis.addLetters([A]);
        const Aseptic_Meningitis = await Modules.findByPk(41);
        await Aseptic_Meningitis.addLetters([A]);
        const Asthma = await Modules.findByPk(42);
        await Asthma.addLetters([A]);
        const Eye_problems = await Modules.findByPk(43);
        await Eye_problems.addLetters([E]);
        const Astigmatism = await Modules.findByPk(44);
        await Astigmatism.addLetters([A]);
        const Fungal_infections = await Modules.findByPk(45);
        await Fungal_infections.addLetters([F]);
        await Fungal_infections.addLetters([I]);
        const Athlete_Foot = await Modules.findByPk(46);
        await Athlete_Foot.addLetters([A]);
        const Attention_Deficit_Hyperactivity_Disorder = await Modules.findByPk(47);
        await Attention_Deficit_Hyperactivity_Disorder.addLetters([A]);
        const Autoimmune_Diseases_Introduction = await Modules.findByPk(48);
        await Autoimmune_Diseases_Introduction.addLetters([A]);
        const Maternal_health_and_postnatal_care = await Modules.findByPk(49);
        await Maternal_health_and_postnatal_care.addLetters([M]);
        const Baby_Blues = await Modules.findByPk(50);
        await Baby_Blues.addLetters([B]);
        const Infant_feeding = await Modules.findByPk(51);
        await Infant_feeding.addLetters([I]);
        const Baby_Care = await Modules.findByPk(52);
        await Baby_Care.addLetters([B]);
        const Infant_health = await Modules.findByPk(53);
        await Infant_health.addLetters([I]);
        const Baby_Health_Checkup = await Modules.findByPk(54);
        await Baby_Health_Checkup.addLetters([B]);
        const Pain = await Modules.findByPk(55);
        await Pain.addLetters([P]);
        const Back_Pain = await Modules.findByPk(56);
        await Back_Pain.addLetters([B]);
        const First_Aid_Bits_and_sticks = await Modules.findByPk(57);            
        await First_Aid_Bits_and_sticks.addLetters([F]);
        const Bee_Stingers = await Modules.findByPk(58);
        await Bee_Stingers.addLetters([B]);
        const Before_Pregnancy_Introduction_to = await Modules.findByPk(59);
        await Before_Pregnancy_Introduction_to.addLetters([B]);
        const Benign_Prostatic_Hyperplasia = await Modules.findByPk(60);
        await Benign_Prostatic_Hyperplasia.addLetters([B]);
        const Alcohol_and_substance_abuse = await Modules.findByPk(61);
        await Alcohol_and_substance_abuse.addLetters([A]);        
        const Binge_Drinking = await Modules.findByPk(62);
        await Binge_Drinking.addLetters([B]);
        const Biosand_filters = await Modules.findByPk(63);
        await Biosand_filters.addLetters([B]);
        const Seminar_in_bipolar_disorder = await Modules.findByPk(64);
        await Seminar_in_bipolar_disorder.addLetters([S]);
        const Bipolar_Disorder = await Modules.findByPk(65);
        await Bipolar_Disorder.addLetters([B]);
        const Family_planning = await Modules.findByPk(66);
        await Family_planning.addLetters([F]);
        const Birth_Control = await Modules.findByPk(67);
        await Birth_Control.addLetters([B]);
        const Birth_Defects = await Modules.findByPk(68);
        await Birth_Defects.addLetters([B]);
        const Urinary_tract_infections = await Modules.findByPk(69);
        await Urinary_tract_infections.addLetters([U]);
        const Bladder_Infections = await Modules.findByPk(70);
        await Bladder_Infections.addLetters([B]);
        const Womens_Health_Blood_disorders = await Modules.findByPk(71);
        await Womens_Health_Blood_disorders.addLetters([W]);
        const Bleeding_Disorders = await Modules.findByPk(72);
        await Bleeding_Disorders.addLetters([B]);
        const Blood_Cells = await Modules.findByPk(73);
        await Blood_Cells.addLetters([B]);
        const Blood_Clostrits = await Modules.findByPk(74);
        await Blood_Clostrits.addLetters([B]);
        const Blood_Disorders = await Modules.findByPk(75);
        await Blood_Disorders.addLetters([B]);
        const Blood_Pressure = await Modules.findByPk(76);
        await Blood_Pressure.addLetters([B]);
        const Blood_Pressure_Medicines = await Modules.findByPk(77);
        await Blood_Pressure_Medicines.addLetters([B]);
        const Obesity = await Modules.findByPk(78);
        await Obesity.addLetters([O]);
        const BMI = await Modules.findByPk(79);
        await BMI.addLetters([B]);
        const Body_Weight = await Modules.findByPk(80);
        await Body_Weight.addLetters([B]);
        const Alternative_Medicine_Introduction = await Modules.findByPk(81);
        await Alternative_Medicine_Introduction.addLetters([A]);
        const Botanicals = await Modules.findByPk(82);
        await Botanicals.addLetters([B]);
        const Diarrhea_dehydration_and_ORT = await Modules.findByPk(83);
        await Diarrhea_dehydration_and_ORT.addLetters([D]);
        const Bowel_Movement = await Modules.findByPk(84);
        await Bowel_Movement.addLetters([B]);
        const Stroke = await Modules.findByPk(85);
        await Stroke.addLetters([S]);
        const Brain_Attack = await Modules.findByPk(86);
        await Brain_Attack.addLetters([B]);
        const Cancer_Bread_Stomach = await Modules.findByPk(87);
        await Cancer_Bread_Stomach.addLetters([C]);
        const Breast_Cancer = await Modules.findByPk(88);
        await Breast_Cancer.addLetters([B]);
        const Breast_Feeding = await Modules.findByPk(89);
        await Breast_Feeding.addLetters([B]);
        const First_Aid_Fractures = await Modules.findByPk(90);
        await First_Aid_Fractures.addLetters([F]);                    
        const Broken_Bones = await Modules.findByPk(91);
        await Broken_Bones.addLetters([B]);
        const Bronchial_Asterisk = await Modules.findByPk(92);
        await Bronchial_Asterisk.addLetters([B]);
        const Pneumonia = await Modules.findByPk(93);
        await Pneumonia.addLetters([P]);
        const Bronchopneumonia = await Modules.findByPk(94);
        await Bronchopneumonia.addLetters([B]);
        const First_Aid_Burns = await Modules.findByPk(95);
        await First_Aid_Burns.addLetters([F]);
        const Burns = await Modules.findByPk(96);
        await Burns.addLetters([B]);
        const CAM = await Modules.findByPk(97);
        await CAM.addLetters([C]);
        const Womens_Health_Cancer = await Modules.findByPk(98);
        await Womens_Health_Cancer.addLetters([W]);
        const Cancer = await Modules.findByPk(99);
        await Cancer.addLetters([C]);
        const Introduction_to_Cancer_Introduction_to_Cancer = await Modules.findByPk(100);
        await Introduction_to_Cancer_Introduction_to_Cancer.addLetters([I]);        
        const Introduction_to_Cancer_Part_1 = await Modules.findByPk(101);
        await Introduction_to_Cancer_Part_1.addLetters([I]);
        const Introduction_to_Cancer_Part_2 = await Modules.findByPk(102);
        await Introduction_to_Cancer_Part_2.addLetters([I]);
        const Introduction_to_Cancer_Part_3 = await Modules.findByPk(103);
        await Introduction_to_Cancer_Part_3.addLetters([I]);
        const Bladder_Cancer_Part_1 = await Modules.findByPk(104);
        await Bladder_Cancer_Part_1.addLetters([B]);
        const Bladder_Cancer_Part_2 = await Modules.findByPk(105);
        await Bladder_Cancer_Part_2.addLetters([B]);
        const Brain_tumors_Part_1 = await Modules.findByPk(106);
        await Brain_tumors_Part_1.addLetters([B]);
        const Brain_tumors_Part_2 = await Modules.findByPk(107);
        await Brain_tumors_Part_2.addLetters([B]);
        const Cervical_cancer_Part_1 = await Modules.findByPk(108);
        await Cervical_cancer_Part_1.addLetters([C]);
        const Cervical_cancer_Part_2 = await Modules.findByPk(109);
        await Cervical_cancer_Part_2.addLetters([C]);
        const Colorectal_cancer_Part_1 = await Modules.findByPk(110);
        await Colorectal_cancer_Part_1.addLetters([C]);
        const Colorectal_cancer_Part_2 = await Modules.findByPk(111);
        await Colorectal_cancer_Part_2.addLetters([C]);
        const Hodgkin_Lymphoma_Part_1 = await Modules.findByPk(112);
        await Hodgkin_Lymphoma_Part_1.addLetters([H]);
        const Hodgkin_Lymphoma_Part_2 = await Modules.findByPk(113);
        await Hodgkin_Lymphoma_Part_2.addLetters([H]);
        const Kidney_Renal_Cancer = await Modules.findByPk(114);
        await Kidney_Renal_Cancer.addLetters([K]);
        const Ovarian_Cancer = await Modules.findByPk(115);
        await Ovarian_Cancer.addLetters([O]);
        const Cáncer_de_Ovario = await Modules.findByPk(116);
        await Cáncer_de_Ovario.addLetters([C]);
        const Pancreatic_cancer = await Modules.findByPk(117);
        await Pancreatic_cancer.addLetters([P]);
        const Prostate_Cancer = await Modules.findByPk(118);
        await Prostate_Cancer.addLetters([P]);
        const Cáncer_de_Próstata = await Modules.findByPk(119);
        await Cáncer_de_Próstata.addLetters([C]);

        console.log('Pivot table seeded successfully!');
    } catch (error) {
        console.error('Error seeding pivot table:', error); 
    }

    console.log('Seeding user_specializations...');
    const users = await Users.findAll();
    const specializations = await Specializations.findAll();

    if (!users.length || !specializations.length) {
      throw new Error('No users or specializations found. Did you seed them first?');
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

    console.log('user_specializations seeded successfully!');
    console.log('Pivot table seeded successfully!');
//   } catch (error) {
//     console.error('Error seeding pivot table:', error);
//   }
};

 seedPivotTable();