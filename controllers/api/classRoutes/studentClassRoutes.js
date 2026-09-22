const router = require('express').Router();
const { Op } = require('sequelize');
const sequelize = require('../../../config/connection');

const {
  Classes,
  Programs,
  Modules,
  Organizations,
  Locations,
  Users,
  ClassEnrollments,
  ClassEnrollmentSpecializations,
  Specializations,
  QuizScores,
} = require('../../../models');
const auth = require('../../../middleware/auth');


// GET /api/classes/available
// Returns active classes currently available for self-enrollment
// for the authenticated student's organization.
router.get('/available', auth, async (req, res) => {
  try {
    // Load the current user from the database rather than relying
    // on organization_id stored in the JWT.
    const user = await Users.findByPk(req.user.id, {
      attributes: [
        'id',
        'organization_id',
      ],
    });

    if (!user) {
      return res.status(404).json({
        message: 'User not found.',
      });
    }

    if (!user.organization_id) {
      return res.status(400).json({
        message: 'User is not assigned to an organization.',
      });
    }

    // DATEONLY values use YYYY-MM-DD, so use today's date
    // when determining whether the enrollment deadline has passed.
    const today = new Date().toISOString().split('T')[0];

    const classes = await Classes.findAll({
      where: {
        organization_id: user.organization_id,
        status: 'active',

        [Op.or]: [
          {
            end_date: null,
          },
          {
            end_date: {
              [Op.gte]: today,
            },
          },
        ],
      },

      include: [
        {
          model: Programs,
          as: 'program',
          attributes: [
            'id',
            'name',
            'training_type',
            'description',
          ],
        },
        {
          model: Organizations,
          as: 'organization',
          attributes: [
            'id',
            'name',
          ],
        },
        {
          model: Locations,
          as: 'location',
          required: false,
        },
        {
          model: ClassEnrollments,
          as: 'class_enrollments',
          required: false,
          where: {
            user_id: user.id,
          },
          attributes: [
            'id',
            'status',
            'enrolled_at',
          ],
          include: [
            {
              model: ClassEnrollmentSpecializations,
              as: 'specialization_selection',
              required: false,
              include: [
                {
                  model: Specializations,
                  as: 'specialization',
                  attributes: [
                    'id',
                    'name',
                  ],
                },
              ],
            },
          ],
        },
      ],

      order: [
        ['start_date', 'ASC'],
      ],
    });

    const availableClasses = classes
      .map((classRecord) => {
        const classData = classRecord.toJSON();

        const enrollment =
          classData.class_enrollments?.length > 0
            ? classData.class_enrollments[0]
            : null;

        delete classData.class_enrollments;

        return {
          ...classData,
          is_enrolled: Boolean(enrollment),
          enrollment,
          specialization_selection:
            enrollment?.specialization_selection ?? null,
        };
      })
      .filter((classData) => {
        // Students already enrolled in the class should continue
        // seeing it even after the enrollment deadline has passed.
        if (classData.is_enrolled) {
          return true;
        }

        // Students who are not enrolled should only see classes
        // whose enrollment period is still open.
        return (
          classData.enrollment_deadline === null ||
          classData.enrollment_deadline >= today
        );
      });

    return res.status(200).json({
      classes: availableClasses,
    });

  } catch (err) {
    console.error('Get available classes error:', err);

    return res.status(500).json({
      message: err.message,
    });
  }
});

// GET /api/classes/progress/basic
// Returns the authenticated student's Basic CHW curriculum
// using the Program -> program_modules -> Modules relationship.
//
// Curriculum membership comes from program_modules,
// not from modules.categories.
router.get('/progress/basic', auth, async (req, res) => {
  try {
    // Always identify the student from the authenticated user.
    const user = await Users.findByPk(req.user.id, {
      attributes: [
        'id',
        'organization_id',
      ],
    });

    if (!user) {
      return res.status(404).json({
        message: 'User not found.',
      });
    }

    // Find the Basic CHW program by training type rather than
    // relying on a hard-coded program ID.
    const program = await Programs.findOne({
      where: {
        training_type: 'basic',
        active: true,
      },
      attributes: [
        'id',
        'name',
        'training_type',
        'description',
      ],
      include: [
        {
          model: Modules,
          as: 'modules',
          attributes: [
            'id',
            'module_id',
            'name',
            'has_quiz',
          ],
          through: {
            attributes: [],
          },
        },
      ],
    });

    if (!program) {
      return res.status(404).json({
        message: 'Basic CHW program not found.',
      });
    }

    // The Basic Training progress tracker represents formal
    // class-based training, so the student must be enrolled
    // in a Basic CHW class.
    const enrollment = await ClassEnrollments.findOne({
      where: {
        user_id: user.id,
      },
      include: [
        {
          model: Classes,
          as: 'class',
          required: true,
          where: {
            program_id: program.id,
          },
          attributes: [
            'id',
            'name',
            'program_id',
            'start_date',
            'end_date',
            'status',
          ],
        },
      ],
    });

    if (!enrollment) {
      return res.status(403).json({
        message:
          'You must be enrolled in a Basic CHW class to view Basic Training progress.',
      });
    }

    // Sort by the curriculum number at the beginning
    // of the module name, matching the admin progress view.
    const modules = (program.modules ?? []).sort((a, b) => {
      const aNumber = parseFloat(a.name);
      const bNumber = parseFloat(b.name);

      return aNumber - bNumber;
    });

    // Only quiz-bearing curriculum modules participate
    // in Basic Training quiz progress.
    const quizModuleIds = modules
      .filter((module) => module.has_quiz)
      .map((module) => module.id);

    // Retrieve this student's quiz scores only for
    // quiz-bearing modules in the Basic CHW curriculum.
    let quizScores = [];

    if (quizModuleIds.length > 0) {
      quizScores = await QuizScores.findAll({
        where: {
          user_id: user.id,
          module_id: {
            [Op.in]: quizModuleIds,
          },
        },
        attributes: [
          'id',
          'user_id',
          'module_id',
          'score',
          'date_taken',
        ],
      });
    }

    return res.status(200).json({
      program: {
        id: program.id,
        name: program.name,
        training_type: program.training_type,
        description: program.description,
      },
      modules,
      quizScores,
    });

  } catch (err) {
    console.error('Get student Basic curriculum error:', err);

    return res.status(500).json({
      message: err.message,
    });
  }
});

// GET /api/classes/progress/act
// Returns the authenticated student's ACT curriculum
// using the Program -> program_modules -> Modules relationship.
//
// Curriculum membership comes from program_modules,
// not from modules.categories.
router.get('/progress/act', auth, async (req, res) => {
  try {
    // Always identify the student from the authenticated user.
    const user = await Users.findByPk(req.user.id, {
      attributes: [
        'id',
        'organization_id',
      ],
    });

    if (!user) {
      return res.status(404).json({
        message: 'User not found.',
      });
    }

    // Find the ACT program by training type rather than
    // relying on a hard-coded program ID.
    const program = await Programs.findOne({
      where: {
        training_type: 'act',
        active: true,
      },
      attributes: [
        'id',
        'name',
        'training_type',
        'description',
      ],
      include: [
        {
          model: Modules,
          as: 'modules',
          attributes: [
            'id',
            'module_id',
            'name',
            'has_quiz',
          ],
          through: {
            attributes: [],
          },
        },
      ],
    });

    if (!program) {
      return res.status(404).json({
        message: 'ACT program not found.',
      });
    }

    // ACT progress represents formal class-based training,
    // so the student must be enrolled in an ACT class.
    const enrollment = await ClassEnrollments.findOne({
      where: {
        user_id: user.id,
      },
      include: [
        {
          model: Classes,
          as: 'class',
          required: true,
          where: {
            program_id: program.id,
          },
          attributes: [
            'id',
            'name',
            'program_id',
            'start_date',
            'end_date',
            'status',
          ],
        },
      ],
    });

    if (!enrollment) {
      return res.status(403).json({
        message:
          'You must be enrolled in an ACT class to view Advanced Training progress.',
      });
    }

    // Sort by the curriculum number at the beginning
    // of the module name, matching the Basic progress behavior.
    const modules = (program.modules ?? []).sort((a, b) => {
      const aNumber = parseFloat(a.name);
      const bNumber = parseFloat(b.name);

      return aNumber - bNumber;
    });

    // Only quiz-bearing ACT curriculum modules participate
    // in Advanced Training quiz progress.
    const quizModuleIds = modules
      .filter((module) => module.has_quiz)
      .map((module) => module.id);

    // Retrieve this student's quiz scores only for
    // quiz-bearing modules in the ACT curriculum.
    let quizScores = [];

    if (quizModuleIds.length > 0) {
      quizScores = await QuizScores.findAll({
        where: {
          user_id: user.id,
          module_id: {
            [Op.in]: quizModuleIds,
          },
        },
        attributes: [
          'id',
          'user_id',
          'module_id',
          'score',
          'date_taken',
        ],
      });
    }

    return res.status(200).json({
      program: {
        id: program.id,
        name: program.name,
        training_type: program.training_type,
        description: program.description,
      },
      modules,
      quizScores,
    });

  } catch (err) {
    console.error('Get student ACT curriculum error:', err);

    return res.status(500).json({
      message: err.message,
    });
  }
});

// GET /api/classes/progress/specialization
// Returns the authenticated student's specialization curriculum
// based on the specialization selected for their class enrollment.
//
// Curriculum membership comes from module_specializations,
// not from program_modules or modules.categories.
router.get('/progress/specialization', auth, async (req, res) => {
  try {
    // Always identify the student from the authenticated user.
    const user = await Users.findByPk(req.user.id, {
      attributes: [
        'id',
        'organization_id',
      ],
    });

    if (!user) {
      return res.status(404).json({
        message: 'User not found.',
      });
    }

    // Find the Specialization program by training type rather than
    // relying on a hard-coded program ID.
    const program = await Programs.findOne({
      where: {
        training_type: 'specialization',
        active: true,
      },
      attributes: [
        'id',
        'name',
        'training_type',
        'description',
      ],
    });

    if (!program) {
      return res.status(404).json({
        message: 'Specialization program not found.',
      });
    }

    // Find the student's specialization class enrollment and
    // load the specialization selected for that enrollment.
    const enrollment = await ClassEnrollments.findOne({
      where: {
        user_id: user.id,
      },
      include: [
        {
          model: Classes,
          as: 'class',
          required: true,
          where: {
            program_id: program.id,
          },
          attributes: [
            'id',
            'name',
            'program_id',
            'start_date',
            'end_date',
            'status',
          ],
        },
        {
          model: ClassEnrollmentSpecializations,
          as: 'specialization_selection',
          required: false,
          include: [
            {
              model: Specializations,
              as: 'specialization',
              attributes: [
                'id',
                'name',
              ],
              include: [
                {
                  model: Modules,
                  as: 'modules',
                  attributes: [
                    'id',
                    'module_id',
                    'name',
                    'has_quiz',
                  ],
                  through: {
                    attributes: [],
                  },
                },
              ],
            },
          ],
        },
      ],
    });

    if (!enrollment) {
      return res.status(403).json({
        message:
          'You must be enrolled in a Specialization class to view Specialization Training progress.',
      });
    }

    const selection = enrollment.specialization_selection;

    if (!selection || !selection.specialization) {
      return res.status(400).json({
        message:
          'You must select a specialization before viewing Specialization Training progress.',
      });
    }

    const specialization = selection.specialization;

    // Sort by the curriculum number at the beginning
    // of the module name, matching Basic and ACT progress.
    const modules = (specialization.modules ?? []).sort((a, b) => {
      const aNumber = parseFloat(a.name);
      const bNumber = parseFloat(b.name);

      return aNumber - bNumber;
    });

    // Only quiz-bearing modules participate in
    // Specialization Training quiz progress.
    const quizModuleIds = modules
      .filter((module) => module.has_quiz)
      .map((module) => module.id);

    // Retrieve this student's quiz scores only for modules
    // belonging to their selected specialization.
    let quizScores = [];

    if (quizModuleIds.length > 0) {
      quizScores = await QuizScores.findAll({
        where: {
          user_id: user.id,
          module_id: {
            [Op.in]: quizModuleIds,
          },
        },
        attributes: [
          'id',
          'user_id',
          'module_id',
          'score',
          'date_taken',
        ],
      });
    }

    return res.status(200).json({
      program: {
        id: program.id,
        name: program.name,
        training_type: program.training_type,
        description: program.description,
      },
      class: {
        id: enrollment.class.id,
        name: enrollment.class.name,
      },
      specialization: {
        id: specialization.id,
        name: specialization.name,
      },
      modules,
      quizScores,
    });

  } catch (err) {
    console.error(
      'Get student Specialization curriculum error:',
      err
    );

    return res.status(500).json({
      message: err.message,
    });
  }
});

// POST /api/classes/:classId/enroll
// Allows the authenticated student to enroll themselves
// in an available Basic CHW or ACT class.
router.post('/:classId/enroll', auth, async (req, res) => {
  try {
    const { classId } = req.params;

    // Always determine the student from the authenticated user.
    // Never accept a user_id from the request body.
    const user = await Users.findByPk(req.user.id, {
      attributes: [
        'id',
        'organization_id',
        'role_id',
      ],
    });

    if (!user) {
      return res.status(404).json({
        message: 'User not found.',
      });
    }

    if (!user.organization_id) {
      return res.status(400).json({
        message: 'User is not assigned to an organization.',
      });
    }

    const classRecord = await Classes.findByPk(classId, {
      include: [
        {
          model: Programs,
          as: 'program',
          attributes: [
            'id',
            'name',
            'training_type',
          ],
        },
      ],
    });

    if (!classRecord) {
      return res.status(404).json({
        message: 'Class not found.',
      });
    }

    // Student may only self-enroll in a class belonging
    // to their current organization.
    if (classRecord.organization_id !== user.organization_id) {
      return res.status(403).json({
        message: 'This class is not available to your organization.',
      });
    }

    // Only active classes are available for self-enrollment.
    if (classRecord.status !== 'active') {
      return res.status(400).json({
        message: 'This class is not currently open for enrollment.',
      });
    }

    const today = new Date().toISOString().split('T')[0];

    // Students cannot enroll in a class after the class has ended.
    if (
      classRecord.end_date &&
      classRecord.end_date < today
    ) {
      return res.status(400).json({
        message: 'This class has ended and is no longer available for enrollment.',
      });
    }

    if (
      classRecord.enrollment_deadline &&
      classRecord.enrollment_deadline < today
    ) {
      return res.status(400).json({
        message: 'The enrollment deadline for this class has passed.',
      });
    }

    // Only Basic CHW and ACT classes use the standard
    // student self-enrollment workflow.
    //
    // Specialization uses the specialization-selection workflow,
    // and CME is not a class-based program.
    const trainingType = classRecord.program?.training_type;

    if (trainingType === 'specialization') {
      return res.status(400).json({
        message:
          'A specialization must be selected before enrolling in this class.',
      });
    }

    if (
      trainingType !== 'basic' &&
      trainingType !== 'act'
    ) {
      return res.status(400).json({
        message:
          'This program is not available for class self-enrollment.',
      });
    }

    // Prevent duplicate enrollment.
    const existingEnrollment = await ClassEnrollments.findOne({
      where: {
        user_id: user.id,
        class_id: classRecord.id,
      },
    });

    if (existingEnrollment) {
      return res.status(400).json({
        message: 'You are already enrolled in this class.',
      });
    }

    const enrollment = await ClassEnrollments.create({
      user_id: user.id,
      class_id: classRecord.id,
      status: 'enrolled',
    });

    return res.status(201).json({
      message: 'Enrollment successful.',
      enrollment,
    });

  } catch (err) {
    console.error('Student self-enrollment error:', err);

    return res.status(500).json({
      message: err.message,
    });
  }
});

// DELETE /api/classes/:classId/enrollment
// Allows the authenticated student to withdraw from a class
// while the enrollment period is still open.
//
// For specialization classes, the student's specialization
// selection is also removed.
router.delete('/:classId/enrollment', auth, async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { classId } = req.params;

    // Always determine the student from the authenticated user.
    const user = await Users.findByPk(req.user.id, {
      attributes: [
        'id',
        'organization_id',
      ],
      transaction,
    });

    if (!user) {
      await transaction.rollback();

      return res.status(404).json({
        message: 'User not found.',
      });
    }

    if (!user.organization_id) {
      await transaction.rollback();

      return res.status(400).json({
        message: 'User is not assigned to an organization.',
      });
    }

    const classRecord = await Classes.findByPk(classId, {
      include: [
        {
          model: Programs,
          as: 'program',
          attributes: [
            'id',
            'name',
            'training_type',
          ],
        },
      ],
      transaction,
    });

    if (!classRecord) {
      await transaction.rollback();

      return res.status(404).json({
        message: 'Class not found.',
      });
    }

    // The class must belong to the student's organization.
    if (classRecord.organization_id !== user.organization_id) {
      await transaction.rollback();

      return res.status(403).json({
        message: 'This class is not available to your organization.',
      });
    }

    const today = new Date().toISOString().split('T')[0];

    // Students cannot withdraw after the class has ended.
    if (
      classRecord.end_date &&
      classRecord.end_date < today
    ) {
      await transaction.rollback();

      return res.status(400).json({
        message:
          'This class has ended and self-withdrawal is no longer available.',
      });
    }

    // Student self-withdrawal is only available while
    // the enrollment period is still open.
    if (
      classRecord.enrollment_deadline &&
      classRecord.enrollment_deadline < today
    ) {
      await transaction.rollback();

      return res.status(400).json({
        message:
          'The enrollment deadline has passed. Please contact an instructor or administrator if you need to withdraw.',
      });
    }

    const enrollment = await ClassEnrollments.findOne({
      where: {
        user_id: user.id,
        class_id: classRecord.id,
      },
      transaction,
    });

    if (!enrollment) {
      await transaction.rollback();

      return res.status(404).json({
        message: 'You are not enrolled in this class.',
      });
    }

    // Specialization selections belong to the class enrollment.
    // Remove one if it exists before removing the enrollment.
    await ClassEnrollmentSpecializations.destroy({
      where: {
        class_enrollment_id: enrollment.id,
      },
      transaction,
    });

    await enrollment.destroy({
      transaction,
    });

    await transaction.commit();

    return res.status(200).json({
      message: 'You have successfully withdrawn from this class.',
    });

  } catch (err) {
    await transaction.rollback();

    console.error('Student class withdrawal error:', err);

    return res.status(500).json({
      message: err.message,
    });
  }
});

// GET /api/classes/:classId/specializations
// Returns specialization options for an available specialization class,
// along with the authenticated student's current selection if one exists.
router.get(
  '/:classId/specializations',
  auth,
  async (req, res) => {
    try {
      const { classId } = req.params;

      // Load the current user from the database.
      const user = await Users.findByPk(req.user.id, {
        attributes: [
          'id',
          'organization_id',
        ],
      });

      if (!user) {
        return res.status(404).json({
          message: 'User not found.',
        });
      }

      if (!user.organization_id) {
        return res.status(400).json({
          message: 'User is not assigned to an organization.',
        });
      }

      // Load the class and confirm that it is a specialization class.
      const classRecord = await Classes.findByPk(classId, {
        include: [
          {
            model: Programs,
            as: 'program',
            attributes: [
              'id',
              'name',
              'training_type',
            ],
          },
        ],
      });

      if (!classRecord) {
        return res.status(404).json({
          message: 'Class not found.',
        });
      }

      if (
        classRecord.program?.training_type !== 'specialization'
      ) {
        return res.status(400).json({
          message:
            'Specializations are only available for specialization classes.',
        });
      }

      // Student may only view specialization choices for
      // a class belonging to their current organization.
      if (
        classRecord.organization_id !== user.organization_id
      ) {
        return res.status(403).json({
          message:
            'This class is not available to your organization.',
        });
      }

      if (classRecord.status !== 'active') {
        return res.status(400).json({
          message:
            'This class is not currently open for enrollment.',
        });
      }

      const today = new Date().toISOString().split('T')[0];

      // Specialization choices are no longer available
      // after the class has ended.
      if (
        classRecord.end_date &&
        classRecord.end_date < today
      ) {
        return res.status(400).json({
          message:
            'This class has ended and specialization choices are no longer available.',
        });
      }

      // All current specialization records are valid choices.
      const specializations = await Specializations.findAll({
        attributes: [
          'id',
          'name',
        ],
        order: [['name', 'ASC']],
      });

      // If the student is already enrolled, retrieve their
      // current specialization selection.
      const enrollment = await ClassEnrollments.findOne({
        where: {
          user_id: user.id,
          class_id: classRecord.id,
        },
      });

      let currentSelection = null;

      if (enrollment) {
        currentSelection =
          await ClassEnrollmentSpecializations.findOne({
            where: {
              class_enrollment_id: enrollment.id,
            },
            include: [
              {
                model: Specializations,
                as: 'specialization',
                attributes: [
                  'id',
                  'name',
                ],
              },
            ],
          });
      }

      return res.status(200).json({
        class: {
          id: classRecord.id,
          name: classRecord.name,
          program_id: classRecord.program_id,
        },
        specializations,
        current_selection: currentSelection,
      });

    } catch (err) {
      console.error(
        'Get student specialization options error:',
        err
      );

      return res.status(500).json({
        message: err.message,
      });
    }
  }
);

// POST /api/classes/:classId/select-specialization
// Selecting a specialization serves as enrollment in a
// specialization class. If the student is already enrolled,
// their existing specialization selection is updated.
router.post(
  '/:classId/select-specialization',
  auth,
  async (req, res) => {
    const transaction = await sequelize.transaction();

    try {
      const { classId } = req.params;
      const { specialization_id } = req.body;

      if (!specialization_id) {
        await transaction.rollback();

        return res.status(400).json({
          message: 'Specialization ID is required.',
        });
      }

      // Load the current user from the database.
      const user = await Users.findByPk(req.user.id, {
        attributes: [
          'id',
          'organization_id',
          'role_id',
        ],
        transaction,
      });

      if (!user) {
        await transaction.rollback();

        return res.status(404).json({
          message: 'User not found.',
        });
      }

      if (!user.organization_id) {
        await transaction.rollback();

        return res.status(400).json({
          message: 'User is not assigned to an organization.',
        });
      }

      // Load the class and confirm that it is a
      // specialization class.
      const classRecord = await Classes.findByPk(classId, {
        include: [
          {
            model: Programs,
            as: 'program',
            attributes: [
              'id',
              'name',
              'training_type',
            ],
          },
        ],
        transaction,
      });

      if (!classRecord) {
        await transaction.rollback();

        return res.status(404).json({
          message: 'Class not found.',
        });
      }

      if (
        classRecord.program?.training_type !== 'specialization'
      ) {
        await transaction.rollback();

        return res.status(400).json({
          message:
            'Specializations can only be selected for specialization classes.',
        });
      }

      // Student may only select a specialization in a class
      // belonging to their current organization.
      if (
        classRecord.organization_id !== user.organization_id
      ) {
        await transaction.rollback();

        return res.status(403).json({
          message:
            'This class is not available to your organization.',
        });
      }

      if (classRecord.status !== 'active') {
        await transaction.rollback();

        return res.status(400).json({
          message:
            'This class is not currently open for enrollment.',
        });
      }

      // Verify that the requested specialization exists.
      const specialization = await Specializations.findByPk(
        specialization_id,
        {
          transaction,
        }
      );

      if (!specialization) {
        await transaction.rollback();

        return res.status(404).json({
          message: 'Specialization not found.',
        });
      }

      // Find an existing enrollment or create one.
      let enrollment = await ClassEnrollments.findOne({
        where: {
          user_id: user.id,
          class_id: classRecord.id,
        },
        transaction,
      });

      const today = new Date().toISOString().split('T')[0];

      // Students cannot select or change a specialization
      // after the class has ended.
      if (
        classRecord.end_date &&
        classRecord.end_date < today
      ) {
        await transaction.rollback();

        return res.status(400).json({
          message:
            'This class has ended and specialization changes are no longer allowed.',
        });
      }

      // The enrollment deadline prevents NEW enrollment,
      // but does not prevent an already-enrolled student
      // from changing their specialization.
      if (
        !enrollment &&
        classRecord.enrollment_deadline &&
        classRecord.enrollment_deadline < today
      ) {
        await transaction.rollback();

        return res.status(400).json({
          message:
            'The enrollment deadline for this class has passed.',
        });
      }

      let enrollmentCreated = false;

      if (!enrollment) {
        enrollment = await ClassEnrollments.create(
          {
            user_id: user.id,
            class_id: classRecord.id,
            status: 'enrolled',
          },
          {
            transaction,
          }
        );

        enrollmentCreated = true;
      }

      // One specialization selection per class enrollment.
      // Existing selections may be changed by the student.
      let selection =
        await ClassEnrollmentSpecializations.findOne({
          where: {
            class_enrollment_id: enrollment.id,
          },
          transaction,
        });

      if (selection) {
        await selection.update(
          {
            specialization_id: specialization.id,
            selected_at: new Date(),
            status: 'active',
          },
          {
            transaction,
          }
        );
      } else {
        selection =
          await ClassEnrollmentSpecializations.create(
            {
              class_enrollment_id: enrollment.id,
              specialization_id: specialization.id,
              selected_at: new Date(),
              status: 'active',
            },
            {
              transaction,
            }
          );
      }

      await transaction.commit();

      return res.status(
        enrollmentCreated ? 201 : 200
      ).json({
        message: enrollmentCreated
          ? 'Specialization selected and enrollment created successfully.'
          : 'Specialization updated successfully.',
        enrollment: {
          id: enrollment.id,
          user_id: enrollment.user_id,
          class_id: enrollment.class_id,
          status: enrollment.status,
        },
        specialization_selection: {
          id: selection.id,
          specialization_id: specialization.id,
          specialization: {
            id: specialization.id,
            name: specialization.name,
          },
        },
      });

    } catch (err) {
      await transaction.rollback();

      console.error(
        'Student specialization selection error:',
        err
      );

      return res.status(500).json({
        message: err.message,
      });
    }
  }
);

module.exports = router;