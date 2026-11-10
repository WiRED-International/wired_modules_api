const {
  Classes,
  ClassEnrollments,
  Exams,
  ExamUserAccess,
} = require('../../models');

/**
 * Grant ExamUserAccess to a user for all exams already assigned to a class.
 */
async function grantClassExamsToUser({
  userId,
  classId,
  grantedBy = null,
  transaction = undefined,
}) {
  if (!userId || !classId || typeof Classes?.findByPk !== 'function') {
    return 0;
  }

  const classRecord = await Classes.findByPk(classId, {
    include: [
      {
        model: Exams,
        as: 'exams',
        attributes: ['id'],
        through: { attributes: [] },
      },
    ],
    ...(transaction ? { transaction } : {}),
  });

  const assignedExams = classRecord?.exams || [];
  if (!Array.isArray(assignedExams) || assignedExams.length === 0) {
    return 0;
  }

  let created = 0;

  for (const exam of assignedExams) {
    const exists = await ExamUserAccess.findOne({
      where: {
        exam_id: exam.id,
        user_id: userId,
      },
      ...(transaction ? { transaction } : {}),
    });

    if (!exists) {
      await ExamUserAccess.create(
        {
          exam_id: exam.id,
          user_id: userId,
          max_attempts: 1,
          granted_by: grantedBy,
        },
        ...(transaction ? [{ transaction }] : [])
      );
      created++;
    }
  }

  return created;
}

/**
 * Backfill ExamUserAccess for any exams assigned to classes in which the user is enrolled.
 */
async function syncEnrolledClassesExamAccessForUser(userId) {
  if (!userId || typeof ClassEnrollments?.findAll !== 'function') {
    return 0;
  }

  const enrollments = await ClassEnrollments.findAll({
    where: {
      user_id: userId,
      status: 'enrolled',
    },
    include: [
      {
        model: Classes,
        as: 'class',
        attributes: ['id'],
        include: [
          {
            model: Exams,
            as: 'exams',
            attributes: ['id'],
            through: { attributes: [] },
          },
        ],
      },
    ],
  });

  if (!Array.isArray(enrollments) || enrollments.length === 0) {
    return 0;
  }

  let created = 0;

  for (const enrollment of enrollments) {
    const assignedExams = enrollment?.class?.exams || [];
    for (const exam of assignedExams) {
      const exists = await ExamUserAccess.findOne({
        where: {
          exam_id: exam.id,
          user_id: userId,
        },
      });

      if (!exists) {
        await ExamUserAccess.create({
          exam_id: exam.id,
          user_id: userId,
          max_attempts: 1,
          granted_by: null,
        });
        created++;
      }
    }
  }

  return created;
}

module.exports = {
  grantClassExamsToUser,
  syncEnrolledClassesExamAccessForUser,
};
