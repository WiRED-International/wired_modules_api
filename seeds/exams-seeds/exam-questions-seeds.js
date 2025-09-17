const ExamQuestions = require('../../models/examModels/examQuestions');

const questions = [
  {
    exam_id: 1,
    question_text: 'What is 2 + 2?',
    options: {
      a: '3',
      b: '4',
      c: '5',
      d: '22'
    },
    correct_answer: 'b',
  },
  {
    exam_id: 1,
    question_text: 'The sun rises in the _____?',
    options: {
      a: 'East',
      b: 'West',
      c: 'North',
      d: 'South'
    },
    correct_answer: 'a',
  },
  {
    exam_id: 1,
    question_text: 'What is 1 + 2?',
    options: {
      a: '3',
      b: '4',
      c: '5',
      d: '22'
    },
    correct_answer: 'a',
  },
  {
    exam_id: 1,
    question_text: 'What is 3 + 2?',
    options: {
      a: '3',
      b: '4',
      c: '5',
      d: '22'
    },
    correct_answer: 'c',
  },
  {
    exam_id: 1,
    question_text: 'Which option is the correct answer?',
    options: {
      a: 'This is the wrong answer',
      b: 'This is also wrong',
      c: 'This is not the correct answer',
      d: 'This is the correct answer'
    },
    correct_answer: 'd',
  },
];

const seedExamQuestions = async () => {
  try {
    const count = await ExamQuestions.count();
    if (count === 0) {
      await ExamQuestions.bulkCreate(questions);
      console.log('Exam questions seeded successfully');
    } else {
      console.log('Exam questions already exist, skipping seed');
    }
  } catch (error) {
    console.error('Error seeding exam questions:', error);
  }
};

module.exports = seedExamQuestions;
