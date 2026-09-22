const router = require('express').Router();
const {
  QuizScores,
  Modules,
  Programs,
  Classes,
  ClassEnrollments,
  ClassEnrollmentSpecializations,
} = require('../../../models');
const auth = require('../../../middleware/auth');
const isAdmin = require('../../../middleware/isAdmin');
const ROLES = require('../../../utils/roles');
const { sendCme50AchievedEmail } = require('../../../services/email');
const { Users } = require('../../../models');
const { Op } = require('sequelize');
const { CmeCertificates } = require('../../../models');
const issueCmeCertificate = require('../../../services/certificates/issueCmeCertificate');
const saveHighestQuizScore = require('../../../services/quizScores/saveHighestQuizScore');
const issueCredential = require('../../../services/credentials/issueCredential');

async function issueCredentialsForModule({ userId, module }) {
  // Find every formal-training program containing this module.
  const programs = await module.getPrograms({
    attributes: ['id', 'training_type'],
    through: { attributes: [] },
  });

  const trainingProgramIds = programs
    .filter((program) =>
      ['basic', 'act', 'specialization'].includes(program.training_type)
    )
    .map((program) => program.id);

  if (trainingProgramIds.length === 0) {
    return;
  }

  // Scores carry forward, so check every relevant class enrollment.
  const enrollments = await ClassEnrollments.findAll({
    where: {
      user_id: userId,
    },
    include: [
      {
        model: Classes,
        as: 'class',
        required: true,
        where: {
          program_id: {
            [Op.in]: trainingProgramIds,
          },
        },
        attributes: ['id', 'program_id'],
      },
    ],
  });

  for (const enrollment of enrollments) {
    try {
      await issueCredential({
        userId,
        classId: enrollment.class_id,
      });
    } catch (error) {
      console.error(
        `Credential issuance failed for user ${userId}, class ${enrollment.class_id}:`,
        error
      );
    }
  }
}

router.get('/', auth, async (req, res) => {
  const { userId } = req.query;
  const userIsAdmin = req.user && (req.user.roleId === ROLES.ADMIN || req.user.roleId === ROLES.SUPER_ADMIN);

  try {
    let quizScores;

    if (userIsAdmin) {
    
      const parsedUserId = userId ? parseInt(userId, 10) : null;
      const whereClause = parsedUserId
        ? { user_id: parsedUserId }
        : { user_id: req.user.id };

      quizScores = await QuizScores.findAll({
        where: whereClause,
        attributes: ["id", "user_id", "module_id", "score", "date_taken"],
        include: [
          {
            model: Modules,
            as: "module",
            attributes: [
              "id",
              "name",
              "module_id",
              "description",
              "version",
              "downloadLink",
              "language",
              "packageSize",
              "redirect_module_id",
              'credit_type',
              'categories',
            ],
            required: false,
          },
        ],
      });
    } else {
      // Regular user: Fetch only their scores
      quizScores = await QuizScores.findAll({
        where: { user_id: req.user.id },
        attributes: ['id', 'module_id', 'score', 'date_taken'],
        include: [
            {
                model: Modules,
                as: 'module',
                attributes: ['id', 'name', 'module_id', 'description', 'version', 'downloadLink', 'language', 'packageSize', 'redirect_module_id', 'credit_type', 'categories', ],
                required: false,
            }
        ]
      });
    }
    console.log("🧠 First quiz score:", quizScores[0]?.module_id);
    console.log("🧩 Joined module:", quizScores[0]?.module);
    res.status(200).json(quizScores);
  } catch (err) {
    console.error('Error creating QuizScores:', err);
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  const { id } = req.params;
  const userIsAdmin = req.user && (req.user.roleId === ROLES.ADMIN || req.user.roleId === ROLES.SUPER_ADMIN);
  try {
    const quizScore = await QuizScores.findByPk(id, {
      attributes: ['id', 'user_id', 'module_id', 'score', 'date_taken'],
      include: [
        {
          model: Modules,
          as: 'module',
          attributes: ['id', 'name', 'credit_type', 'categories'],
          required: false,
        },
      ],
    });

    if (!quizScore) {
      return res.status(404).json({ message: 'Quiz Score not found' });
    }

    // Ensure users can access only their own scores
    if (!userIsAdmin && quizScore.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.status(200).json(quizScore);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { module_id, score, date_taken } = req.body;

    if (module_id == null || score == null) {
      return res.status(400).json({
        message: 'module_id and score are required'
      });
    }

    // The authenticated user is always the owner of the submitted score.
    const parsedUserId = req.user.id;
    const parsedScore = parseFloat(score);

    if (isNaN(parsedScore)) {
      return res.status(400).json({
        message: 'Invalid score'
      });
    }

    // Find the module by the `module_id` field (not the primary key)
    const module = await Modules.findOne({ where: { module_id } });

    if (!module) {
      return res.status(404).json({ message: 'Module not found' });
    }

    const resolvedModuleId = module.id;

    // Formal training modules require the appropriate class enrollment.
    // CME modules do not require class enrollment.
    if (module.credit_type !== 'cme') {
      const programs = await module.getPrograms({
        attributes: ['id', 'name', 'training_type'],
        through: { attributes: [] },
      });

      const trainingProgram = programs.find(
        (program) =>
          program.training_type === 'basic' ||
          program.training_type === 'act' ||
          program.training_type === 'specialization'
      );

      if (trainingProgram) {
        const enrollment = await ClassEnrollments.findOne({
          where: {
            user_id: parsedUserId,
          },
          include: [
            {
              model: Classes,
              as: 'class',
              required: true,
              where: {
                program_id: trainingProgram.id,
              },
              attributes: ['id', 'name', 'program_id'],
            },
          ],
        });

        if (!enrollment) {
          return res.status(403).json({
            message: `You must be enrolled in a ${trainingProgram.name} class before submitting this quiz score.`,
          });
        }

        // Specialization modules must also belong to the student's
        // selected specialization for that class enrollment.
        if (trainingProgram.training_type === 'specialization') {
          const specializationSelection =
            await ClassEnrollmentSpecializations.findOne({
              where: {
                class_enrollment_id: enrollment.id,
              },
            });

          if (!specializationSelection) {
            return res.status(403).json({
              message:
                'You must select a specialization before submitting this quiz score.',
            });
          }

          const moduleSpecializations = await module.getSpecializations({
            attributes: ['id'],
            through: { attributes: [] },
          });

          const moduleBelongsToSelectedSpecialization =
            moduleSpecializations.some(
              (specialization) =>
                specialization.id === specializationSelection.specialization_id
            );

          if (!moduleBelongsToSelectedSpecialization) {
            return res.status(403).json({
              message:
                'This module does not belong to your selected specialization.',
            });
          }
        }
      }
    }

    let quizScore;
    let created;

    if (module.credit_type !== 'cme') {
      const result = await saveHighestQuizScore({
        userId: parsedUserId,
        moduleId: resolvedModuleId,
        score: parsedScore,
        dateTaken: new Date(date_taken || Date.now()),
      });

      quizScore = result.quizScore;
      created = result.created;
    } else {
      // Preserve the existing CME score-saving behavior.
      [quizScore, created] = await QuizScores.upsert({
        module_id: resolvedModuleId,
        user_id: parsedUserId,
        score: parsedScore,
        date_taken: date_taken || new Date(),
      });
    }

    // Recheck WiRED credentials after a passing formal-training score.
    // A lower retake does not erase an earlier passing best score.
    if (
      module.credit_type !== 'cme' &&
      quizScore.score >= 80
    ) {
      try {
        await issueCredentialsForModule({
          userId: parsedUserId,
          module,
        });
      } catch (credentialError) {
        console.error(
          `Credential recheck failed for user ${parsedUserId}, module ${resolvedModuleId}:`,
          credentialError
        );
      }
    }

    // 🧠 CME logic — 5 credits for score ≥ 80 only if module.credit_type === 'cme'
    // 🧠 CME logic — award credits once per module per year
    let credits_awarded = 0;
    const passed = parsedScore >= 80;

    const firstPassThisYear = await QuizScores.count({
      where: {
        user_id: parsedUserId,
        module_id: resolvedModuleId,
        score: { [Op.gte]: 80 },
        date_taken: {
          [Op.between]: [
            new Date(`${new Date().getFullYear()}-01-01`),
            new Date(`${new Date().getFullYear()}-12-31`),
          ],
        },
      },
    });

    if (passed && module.credit_type === 'cme' && firstPassThisYear === 1) {
      credits_awarded = 5;

      const user = await Users.findByPk(parsedUserId);
      if (!user) {
        throw new Error('User not found for CME update');
      }

      const currentYear = new Date().getFullYear();

      // Year rollover (lazy reset)
      if (user.cme_year !== currentYear) {
        user.cme_year = currentYear;
        user.cme_credits = 0;
        user.cme_certificate_issued_at = null;
      }

      const previousCredits = user.cme_credits;
      user.cme_credits += credits_awarded;

      // 🎓 Certificate trigger (once per year)
      if (
        previousCredits < 50 &&
        user.cme_credits >= 50 &&
        !user.cme_certificate_issued_at
      ) {
        user.cme_certificate_issued_at = new Date();

        try {
          const year = new Date().getFullYear();

          // ✅ CREATE the certificate record (ONCE)
          const certificate = await issueCmeCertificate({
            user_id: user.id,
            year,
            issued_at: new Date(),
          });

          // keep user flag (useful, but not the source of truth)
          user.cme_certificate_issued_at = certificate.issued_at;

          // ✅ Send email using the REAL certificate
          await sendCme50AchievedEmail(user, certificate);

        } catch (emailErr) {
          console.error(
            `❌ CME certificate email failed for user ${user.id} (${user.email})`,
            emailErr
          );
        }
      }

      await user.save();
    }

    res.status(created ? 201 : 200).json({
      message: created ? 'Quiz Score created successfully' : 'Quiz Score updated successfully',
      quizScore,
      passed,
      credits_awarded,
      credit_type: module.credit_type,
      module_name: module.name,
    });

  } catch (err) {
    console.error('Sequelize error stack:', err.stack);
    console.error('Database error:', err.parent || err.original);
    res.status(500).json({
      message: 'Internal Server Error',
      errors: err.errors || [],
    });
  }
});

router.put('/:id', auth, isAdmin, async (req, res) => {
  const { id } = req.params;
  const { score, date_taken } = req.body;

  try {
    const quizScore = await QuizScores.findByPk(id);

    if (!quizScore) {
      return res.status(404).json({ message: 'Quiz Score not found' });
    }

    // Validate score
    const parsedScore = parseFloat(score);
    if (isNaN(parsedScore) || parsedScore < 0) {
      return res.status(400).json({ message: 'Invalid score value provided.' });
    }

    await quizScore.update({
      score: parsedScore,
      date_taken: date_taken || quizScore.date_taken,
    });

    res.status(200).json({
      message: 'Quiz Score updated successfully',
      quizScore,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


router.delete('/:id', auth, isAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const quizScore = await QuizScores.findByPk(id);
    if (!quizScore) {
      return res.status(404).json({ message: 'Quiz Score not found' });
    }

    await quizScore.destroy();
    res.status(200).json({ message: 'Quiz Score deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;