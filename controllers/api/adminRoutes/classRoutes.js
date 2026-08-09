const router = require('express').Router();

const {
  Classes,
  Programs,
  Organizations,
  Users,
  ClassEnrollments,
} = require('../../../models');

const auth = require('../../../middleware/auth');
const requireRoles = require('../../../middleware/requireRoles');

const ROLES = require('../../../utils/roles');

router.get(
  '/',
  auth,
  requireRoles(ROLES.SUPER_ADMIN, ROLES.INSTRUCTOR),
  async (req, res) => {
    try {
      const where = {};

      // Instructors can only see classes belonging to their organization.
      if (req.user.roleId === ROLES.INSTRUCTOR) {
        if (!req.user.organization_id) {
          return res.status(400).json({
            message: 'Instructor is not assigned to an organization.',
          });
        }

        where.organization_id = req.user.organization_id;
      }

      const classes = await Classes.findAll({
        where,
        include: [
          {
            model: Programs,
            as: 'program',
          },
          {
            model: Organizations,
            as: 'organization',
          },
          {
            model: Users,
            as: 'created_by_user',
            attributes: ['id', 'first_name', 'last_name', 'email'],
          },
        ],
        order: [['start_date', 'DESC']],
      });

      return res.status(200).json({
        classes,
      });
    } catch (err) {
      console.error('Get classes error:', err);

      return res.status(500).json({
        message: err.message,
      });
    }
  }
);

router.post(
  '/',
  auth,
  requireRoles(ROLES.SUPER_ADMIN, ROLES.INSTRUCTOR),
  async (req, res) => {
    try {
      const {
        organization_id,
        program_id,
        name,
        description,
        start_date,
        end_date,
        enrollment_deadline,
      } = req.body;

      // Required fields
      if (!program_id || !name || !start_date || !end_date) {
        return res.status(400).json({
          message: 'Program, class name, start date, and end date are required.',
        });
      }

      // Determine which organization owns the class
      let organizationId;

      if (req.user.roleId === ROLES.SUPER_ADMIN) {
        if (!organization_id) {
          return res.status(400).json({
            message: 'Organization is required.',
          });
        }

        organizationId = organization_id;
      } else {
        // Instructor is always restricted to their own organization
        if (!req.user.organization_id) {
          return res.status(400).json({
            message: 'Instructor is not assigned to an organization.',
          });
        }

        organizationId = req.user.organization_id;
      }

      // Verify organization exists
      const organization = await Organizations.findByPk(organizationId);

      if (!organization) {
        return res.status(404).json({
          message: 'Organization not found.',
        });
      }

      // Verify program exists and is active
      const program = await Programs.findByPk(program_id);

      if (!program) {
        return res.status(404).json({
          message: 'Program not found.',
        });
      }

      if (!program.active) {
        return res.status(400).json({
          message: 'This program is not currently active.',
        });
      }

      // Validate dates
      if (new Date(end_date) < new Date(start_date)) {
        return res.status(400).json({
          message: 'End date cannot be before start date.',
        });
      }

      // Create class
      const newClass = await Classes.create({
        organization_id: organizationId,
        program_id,
        name: name.trim(),
        description: description?.trim() || null,
        start_date,
        end_date,
        enrollment_deadline: enrollment_deadline || null,
        created_by_user_id: req.user.id,
      });

      // Return class with its related program, organization, and creator
      const createdClass = await Classes.findByPk(newClass.id, {
        include: [
          {
            model: Programs,
            as: 'program',
          },
          {
            model: Organizations,
            as: 'organization',
          },
          {
            model: Users,
            as: 'created_by_user',
            attributes: ['id', 'first_name', 'last_name', 'email'],
          },
        ],
      });

      return res.status(201).json({
        message: 'Class created successfully.',
        class: createdClass,
      });
    } catch (err) {
      console.error('Create class error:', err);

      return res.status(500).json({
        message: err.message,
      });
    }
  }
);

router.post(
  '/:classId/enrollments',
  auth,
  requireRoles(ROLES.SUPER_ADMIN, ROLES.INSTRUCTOR),
  async (req, res) => {
    try {
      const { classId } = req.params;
      const { user_id } = req.body;

      if (!user_id) {
        return res.status(400).json({
          message: 'User ID is required.',
        });
      }

      // Find the class first.
      const classRecord = await Classes.findByPk(classId);

      if (!classRecord) {
        return res.status(404).json({
          message: 'Class not found.',
        });
      }

      // Instructor can only manage classes belonging to their organization.
      if (
        req.user.roleId === ROLES.INSTRUCTOR &&
        classRecord.organization_id !== req.user.organization_id
      ) {
        return res.status(403).json({
          message: 'You do not have permission to manage this class.',
        });
      }

      // Make sure the student exists.
      const user = await Users.findByPk(user_id);

      if (!user) {
        return res.status(404).json({
          message: 'User not found.',
        });
      }

      // Prevent duplicate enrollment.
      const existingEnrollment = await ClassEnrollments.findOne({
        where: {
          user_id,
          class_id: classRecord.id,
        },
      });

      if (existingEnrollment) {
        return res.status(400).json({
          message: 'User is already enrolled in this class.',
        });
      }

      const enrollment = await ClassEnrollments.create({
        user_id,
        class_id: classRecord.id,
        status: 'enrolled',
      });

      return res.status(201).json({
        message: 'User enrolled successfully.',
        enrollment,
      });
    } catch (err) {
      console.error('Enroll user error:', err);

      return res.status(500).json({
        message: err.message,
      });
    }
  }
);

router.get(
  '/:classId',
  auth,
  requireRoles(ROLES.SUPER_ADMIN, ROLES.INSTRUCTOR),
  async (req, res) => {
    try {
      const { classId } = req.params;

      const classRecord = await Classes.findByPk(classId, {
        include: [
          {
            model: Programs,
            as: 'program',
          },
          {
            model: Organizations,
            as: 'organization',
          },
          {
            model: Users,
            as: 'created_by_user',
            attributes: [
              'id',
              'first_name',
              'last_name',
              'email',
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
      // to their organization.
      if (
        req.user.roleId === ROLES.INSTRUCTOR &&
        classRecord.organization_id !== req.user.organization_id
      ) {
        return res.status(403).json({
          message: 'You do not have permission to view this class.',
        });
      }

      return res.status(200).json({
        class: classRecord,
      });
    } catch (err) {
      console.error('Get class error:', err);

      return res.status(500).json({
        message: err.message,
      });
    }
  }
);

router.get(
  '/:classId/enrollments',
  auth,
  requireRoles(ROLES.SUPER_ADMIN, ROLES.INSTRUCTOR),
  async (req, res) => {
    try {
      const { classId } = req.params;

      // Find the class first.
      const classRecord = await Classes.findByPk(classId);

      if (!classRecord) {
        return res.status(404).json({
          message: 'Class not found.',
        });
      }

      // Instructor can only view classes belonging to their organization.
      if (
        req.user.roleId === ROLES.INSTRUCTOR &&
        classRecord.organization_id !== req.user.organization_id
      ) {
        return res.status(403).json({
          message: 'You do not have permission to view this class.',
        });
      }

      // Get the class enrollments and associated students.
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
              'organization_id',
            ],
          },
        ],
        order: [['enrolled_at', 'ASC']],
      });

      return res.status(200).json({
        class: {
          id: classRecord.id,
          name: classRecord.name,
          organization_id: classRecord.organization_id,
          program_id: classRecord.program_id,
        },
        enrollments,
      });
    } catch (err) {
      console.error('Get class enrollments error:', err);

      return res.status(500).json({
        message: err.message,
      });
    }
  }
);

router.delete(
  '/:classId/enrollments/:userId',
  auth,
  requireRoles(ROLES.SUPER_ADMIN, ROLES.INSTRUCTOR),
  async (req, res) => {
    try {
      const { classId, userId } = req.params;

      // Find the class first.
      const classRecord = await Classes.findByPk(classId);

      if (!classRecord) {
        return res.status(404).json({
          message: 'Class not found.',
        });
      }

      // Instructor can only manage classes belonging to their organization.
      if (
        req.user.roleId === ROLES.INSTRUCTOR &&
        classRecord.organization_id !== req.user.organization_id
      ) {
        return res.status(403).json({
          message: 'You do not have permission to manage this class.',
        });
      }

      // Find this student's enrollment in this specific class.
      const enrollment = await ClassEnrollments.findOne({
        where: {
          class_id: classRecord.id,
          user_id: userId,
        },
      });

      if (!enrollment) {
        return res.status(404).json({
          message: 'Enrollment not found.',
        });
      }

      await enrollment.destroy();

      return res.status(200).json({
        message: 'User removed from class successfully.',
      });
    } catch (err) {
      console.error('Remove user from class error:', err);

      return res.status(500).json({
        message: err.message,
      });
    }
  }
);

module.exports = router;