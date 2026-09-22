const router = require('express').Router();
const { Op } = require('sequelize');

const {
  Classes,
  Programs,
  Modules,
  Users,
  ClassEnrollments,
  ClassEnrollmentSpecializations,
  Specializations,
  QuizScores,
  Exams,
  ExamTemplates,
  ExamSessions,
  AdminPermissions,
} = require('../../../models');

const auth = require('../../../middleware/auth');
const requireRoles = require('../../../middleware/requireRoles');
const ROLES = require('../../../utils/roles');


router.get(
  '/:classId/progress',
  auth,
  requireRoles(
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES.INSTRUCTOR
  ),
  async (req, res) => {
    try {
      const { classId } = req.params;

      // Find the class and its program.
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

      // Instructor can only view classes belonging
      // to their own organization.
      if (
        req.user.roleId === ROLES.INSTRUCTOR &&
        classRecord.organization_id !== req.user.organization_id
      ) {
        return res.status(403).json({
          message: 'You do not have permission to view this class.',
        });
      }

      // Admin can only view classes belonging to
      // organizations assigned through AdminPermissions.
      if (req.user.roleId === ROLES.ADMIN) {
        const permission = await AdminPermissions.findOne({
          where: {
            admin_id: req.user.id,
            organization_id: classRecord.organization_id,
          },
        });

        if (!permission) {
          return res.status(403).json({
            message: 'You do not have permission to view this class.',
          });
        }
      }

      // Get the modules associated with this class's program.
      const program = await Programs.findByPk(
        classRecord.program_id,
        {
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
        }
      );

      // Sort modules by the curriculum number
      // at the beginning of the module name.
      const modules = (program?.modules ?? []).sort((a, b) => {
        const aNumber = parseFloat(a.name);
        const bNumber = parseFloat(b.name);

        return aNumber - bNumber;
      });

      // Get students enrolled in this class.
      const enrollments = await ClassEnrollments.findAll({
        where: {
          class_id: classRecord.id,
        },
        include: [
          {
            model: Users,
            as: 'user',
            attributes: [
              'id',
              'wired_user_id',
              'first_name',
              'last_name',
              'email',
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
                required: false,
              },
            ],
          },
        ],
        order: [
          [
            {
              model: Users,
              as: 'user',
            },
            'last_name',
            'ASC',
          ],
          [
            {
              model: Users,
              as: 'user',
            },
            'first_name',
            'ASC',
          ],
        ],
      });

      const students = enrollments
        .filter((enrollment) => enrollment.user)
        .map((enrollment) => ({
          ...enrollment.user.toJSON(),

          class_enrollment_id: enrollment.id,

          specialization_selection:
            enrollment.specialization_selection ?? null,
        }));

      // For specialization classes, load the modules associated
      // with each student's selected specialization.
      if (
        classRecord.program?.training_type === 'specialization'
      ) {
        for (const student of students) {
          const specializationId =
            student.specialization_selection?.specialization_id;

          // A student may be enrolled before choosing
          // their specialization.
          if (!specializationId) {
            student.modules = [];
            continue;
          }

          const specialization = await Specializations.findByPk(
            specializationId,
            {
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
            }
          );

          const specializationModules =
            specialization?.modules ?? [];

          // Sort by the curriculum number at the
          // beginning of the module name.
          specializationModules.sort((a, b) => {
            const aNumber = parseFloat(a.name);
            const bNumber = parseFloat(b.name);

            return aNumber - bNumber;
          });

          student.modules = specializationModules;
        }
      }

      // Get quiz scores for students in this class,
      // limited to modules belonging to this program.
      const studentIds = students.map((student) => student.id);

      let moduleIds = [];

      // Specialization students can have different module sets,
      // based on the specialization selected for their enrollment.
      if (
        classRecord.program?.training_type === 'specialization'
      ) {
        moduleIds = [
          ...new Set(
            students.flatMap((student) =>
              (student.modules ?? [])
                .filter((module) => module.has_quiz)
                .map((module) => module.id)
            )
          ),
        ];
      } else {
        // Basic, ACT, CME, etc. use the modules
        // assigned directly to the program.
        moduleIds = modules
          .filter((module) => module.has_quiz)
          .map((module) => module.id);
      }

      let quizScores = [];

      if (studentIds.length > 0 && moduleIds.length > 0) {
        quizScores = await QuizScores.findAll({
          where: {
            user_id: {
              [Op.in]: studentIds,
            },
            module_id: {
              [Op.in]: moduleIds,
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

      // Get exams assigned to this class,
      // including the exam template and class-specific student attempts.
      const exams = await Exams.findAll({
        include: [
          {
            model: Classes,
            as: 'classes',
            attributes: [],
            where: {
              id: classRecord.id,
            },
            through: {
              attributes: [],
            },
            required: true,
          },
          {
            model: ExamTemplates,
            as: 'exam_template',
            attributes: [
              'id',
              'title',
              'program',
              'exam_type',
            ],
            required: false,
          },
          {
            model: ExamSessions,
            as: 'exam_sessions',
            attributes: [
              'id',
              'user_id',
              'class_id',
              'attempt_number',
              'score',
              'submitted_at',
              'active',
            ],
            where: {
              class_id: classRecord.id,
            },
            required: false,
          },
        ],
        attributes: [
          'id',
          'title',
          'exam_template_id',
        ],
      });


      return res.status(200).json({
        class: {
          id: classRecord.id,
          name: classRecord.name,
          organization_id: classRecord.organization_id,
          program_id: classRecord.program_id,
          program: classRecord.program,
        },

        modules,
        students,
        quizScores,
        exams,
      });
    } catch (err) {
      console.error('Get class progress error:', err);

      return res.status(500).json({
        message: err.message,
      });
    }
  }
);


module.exports = router;