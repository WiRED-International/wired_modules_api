const {
  Classes,
  Programs,
  ClassEnrollments,
  ClassEnrollmentSpecializations,
} = require('../../models');

const checkModuleRequirements = require('./checkModuleRequirements');
const findPassingFinalExam = require('./findPassingFinalExam');

async function checkCredentialEligibility({ userId, classId }) {
  const enrollment = await ClassEnrollments.findOne({
    where: {
      user_id: userId,
      class_id: classId,
    },
    include: [
      {
        model: Classes,
        as: 'class',
        required: true,
        include: [
          {
            model: Programs,
            as: 'program',
            required: true,
          },
        ],
      },
      {
        model: ClassEnrollmentSpecializations,
        as: 'specialization_selection',
        required: false,
      },
    ],
  });

  if (!enrollment) {
    return {
      eligible: false,
      reason: 'Student is not enrolled in this class.',
    };
  }

  const trainingClass = enrollment.class;
  const program = trainingClass.program;
  const credentialType = program.training_type;

  if (!['basic', 'act', 'specialization'].includes(credentialType)) {
    return {
      eligible: false,
      reason: 'This program does not award a WiRED training credential.',
    };
  }

  const specializationId =
    credentialType === 'specialization'
      ? enrollment.specialization_selection?.specialization_id || null
      : null;

  if (credentialType === 'specialization' && !specializationId) {
    return {
      eligible: false,
      reason: 'A specialization has not been selected.',
    };
  }

  const modules = await checkModuleRequirements({
    userId,
    programId: program.id,
    specializationId,
  });

  const finalExam = await findPassingFinalExam({
    userId,
    classId,
    credentialType,
  });

  return {
    eligible: modules.all_passed && Boolean(finalExam),
    user_id: userId,
    class_id: classId,
    program_id: program.id,
    credential_type: credentialType,
    specialization_id: specializationId,
    modules,
    final_exam: finalExam
      ? {
          session_id: finalExam.id,
          exam_id: finalExam.exam_id,
          score: finalExam.score,
          submitted_at: finalExam.submitted_at,
        }
      : null,
  };
}

module.exports = checkCredentialEligibility;