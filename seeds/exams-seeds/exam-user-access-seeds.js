const ExamUserAccess = require('../../models/examModels/examUserAccess');

const examUserAccess = [
  {
    exam_id: 1,
    user_id: 1, 
    available_from: new Date(Date.now() - 10 * 60 * 1000),
    available_until: new Date(Date.now() + 2 * 60 * 60 * 1000),
    max_attempts: 1,
    granted_by: 9, // Admin ID 
    reason: 'First attempt for Kisumu pilot',
  },
  {
    exam_id: 1,
    user_id: 2,
    available_from: new Date(Date.now() - 10 * 60 * 1000),
    available_until: new Date(Date.now() + 2 * 60 * 60 * 1000),
    max_attempts: 2,
    granted_by: 9,
    reason: 'Retake allowed due to connectivity issue',
  }
];

const seedExamUserAccess = async () => {
  try {
    const count = await ExamUserAccess.count();
    if (count === 0) {
      await ExamUserAccess.bulkCreate(examUserAccess);
      console.log('ExamUserAccess seeded successfully');
    } else {
      console.log('ExamUserAccess already exists, skipping seed');
    }
  } catch (error) {
    console.error('Error seeding ExamUserAccess:', error);
  }
};

module.exports = seedExamUserAccess;