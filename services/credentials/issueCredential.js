const crypto = require('crypto');
const { UniqueConstraintError } = require('sequelize');

const sequelize = require('../../config/connection');

const {
  Credentials,
  Users,
  Classes,
} = require('../../models');

const checkCredentialEligibility = require('./checkCredentialEligibility');

function formatCredentialNumber(id) {
  return `WCR-${String(id).padStart(8, '0')}`;
}

async function issueCredential({ userId, classId }) {
  // Recheck the student's current eligibility before writing anything.
  const eligibility = await checkCredentialEligibility({
    userId,
    classId,
  });

  if (!eligibility.eligible) {
    return {
      issued: false,
      reason: 'Student does not currently meet credential requirements.',
      eligibility,
    };
  }

  const credentialType = eligibility.credential_type;

  try {
    return await sequelize.transaction(async (transaction) => {
      // Prevent duplicate credentials for the same student/class/type.
      const existingCredential = await Credentials.findOne({
        where: {
          user_id: userId,
          class_id: classId,
          credential_type: credentialType,
        },
        transaction,
      });

      if (existingCredential) {
        return {
          issued: false,
          already_exists: true,
          credential: existingCredential,
          eligibility,
        };
      }

      const user = await Users.findByPk(userId, {
        attributes: [
          'id',
          'wired_user_id',
          'first_name',
          'last_name',
        ],
        transaction,
      });

      if (!user) {
        throw new Error(`User not found: ${userId}`);
      }

      const trainingClass = await Classes.findByPk(classId, {
        attributes: ['id', 'name'],
        transaction,
      });

      if (!trainingClass) {
        throw new Error(`Class not found: ${classId}`);
      }

      const awardedAt = new Date();

      // credential_number is NOT NULL, so create the row with a temporary
      // unique value. Once MySQL assigns the credential ID, replace it with
      // the permanent WCR number.
      const temporaryCredentialNumber =
        `TMP-${crypto.randomBytes(8).toString('hex')}`;

      const credential = await Credentials.create(
        {
          credential_number: temporaryCredentialNumber,

          credential_type: credentialType,

          user_id: userId,
          class_id: classId,
          program_id: eligibility.program_id,
          specialization_id: eligibility.specialization_id,

          wired_user_id_snapshot: user.wired_user_id,

          student_name_snapshot:
            `${user.first_name} ${user.last_name}`.trim(),

          class_name_snapshot: trainingClass.name,

          awarded_at: awardedAt,

          exam_session_id: eligibility.final_exam.session_id,
          exam_score_snapshot: eligibility.final_exam.score,
          exam_completed_at_snapshot:
            eligibility.final_exam.submitted_at,

          requirements_snapshot: {
            credential_type: credentialType,
            program_id: eligibility.program_id,
            specialization_id: eligibility.specialization_id,
            modules: eligibility.modules,
            final_exam: eligibility.final_exam,
          },

          status: 'awarded',
        },
        {
          transaction,
        }
      );

      const credentialNumber =
        formatCredentialNumber(credential.id);

      await credential.update(
        {
          credential_number: credentialNumber,
        },
        {
          transaction,
        }
      );

      return {
        issued: true,
        already_exists: false,
        credential,
        eligibility,
      };
    });
  } catch (error) {
    /*
     * The database already has a unique constraint on:
     *
     * user_id + class_id + credential_type
     *
     * If two issuance attempts happen at almost exactly the same time,
     * one may win the race and the other may hit that constraint.
     * In that case, return the credential that already exists.
     */
    if (error instanceof UniqueConstraintError) {
      const existingCredential = await Credentials.findOne({
        where: {
          user_id: userId,
          class_id: classId,
          credential_type: credentialType,
        },
      });

      if (existingCredential) {
        return {
          issued: false,
          already_exists: true,
          credential: existingCredential,
          eligibility,
        };
      }
    }

    throw error;
  }
}

module.exports = issueCredential;