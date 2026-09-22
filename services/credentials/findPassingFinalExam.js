const { Op } = require('sequelize');
const {
  ExamSessions,
  Exams,
  ExamTemplates,
  Classes,
} = require('../../models');

const EXAM_TYPES = {
  basic: 'basic_qualifying',
  act: 'act_final',
  specialization: 'specialization_final',
};

async function findPassingFinalExam({
  userId,
  classId,
  credentialType,
}) {
  const examType = EXAM_TYPES[credentialType];

  if (!examType) {
    throw new Error(`Unsupported credential type: ${credentialType}`);
  }

  const session = await ExamSessions.findOne({
    where: {
      user_id: userId,
      class_id: classId,
      submitted_at: { [Op.ne]: null },
      score: { [Op.gte]: 80 },
    },
    include: [
      {
        model: Exams,
        as: 'exams',
        required: true,
        include: [
          {
            model: ExamTemplates,
            as: 'exam_template',
            required: true,
            where: {
              exam_type: examType,
            },
          },
          {
            model: Classes,
            as: 'classes',
            required: true,
            where: {
              id: classId,
            },
            through: {
              attributes: [],
            },
            attributes: ['id'],
          },
        ],
      },
    ],
    order: [
      ['score', 'DESC'],
      ['submitted_at', 'DESC'],
    ],
  });

  return session;
}

module.exports = findPassingFinalExam;