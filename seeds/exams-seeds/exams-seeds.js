const Exams = require('../../models/examModels/exam');

const exams = [
  {
    id: 1,
    title: 'Math Exam',
    description: 'Math Exam Description',
   available_from: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
    available_until: new Date(Date.now() + 3 * 60 * 60 * 1000), // 3 hours from now
    duration_minutes: 120,
  }, 
];

const seedExams = async () => {
  try {
    const count = await Exams.count();
    if (count === 0) {
        await Exams.bulkCreate(exams);
        console.log('Exams seeded successfully');
    } else {
        console.log('Exams already exist, skipping seed');
    }
  } catch (error) {
    console.error('Error seeding exams:', error);
  }
};

module.exports = seedExams;