const router = require('express').Router();

const {
  Exams,
  Classes,
  ClassEnrollments,
  ExamUserAccess,
  AdminPermissions,
} = require('../../../models');

const auth = require('../../../middleware/auth');
const requireRoles = require('../../../middleware/requireRoles');
const ROLES = require('../../../utils/roles');

/**
 * POST /api/admin/exams/:examId/assign-class/:classId
 *
 * Assign a class to an exam.
 * 1. Add the class to exam_class.
 * 2. Grant ExamUserAccess to all enrolled students in the class.
 */
router.post(
  '/:examId/assign-class/:classId',
  auth,
  requireRoles(
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES.INSTRUCTOR
  ),
  async (req, res) => {
    const { examId, classId } = req.params;

    try {
      // Ensure exam exists.
      const exam = await Exams.findByPk(examId);

      if (!exam) {
        return res.status(404).json({
          message: 'Exam not found.',
        });
      }

      // Ensure class exists.
      const classRecord = await Classes.findByPk(classId);

      if (!classRecord) {
        return res.status(404).json({
          message: 'Class not found.',
        });
      }

      // Instructor can only assign exams to classes
      // belonging to their own organization.
      if (
        req.user.roleId === ROLES.INSTRUCTOR &&
        classRecord.organization_id !== req.user.organization_id
      ) {
        return res.status(403).json({
          message: 'You do not have permission to manage this class.',
        });
      }

      // Admin can only assign exams to classes belonging
      // to organizations granted through AdminPermissions.
      if (req.user.roleId === ROLES.ADMIN) {
        const permission = await AdminPermissions.findOne({
          where: {
            admin_id: req.user.id,
            organization_id: classRecord.organization_id,
          },
        });

        if (!permission) {
          return res.status(403).json({
            message: 'You do not have permission to manage this class.',
          });
        }
      }

      // Add the class to this exam.
      await exam.addClass(classRecord);

      // Find all enrolled students in the class.
      const enrollments = await ClassEnrollments.findAll({
        where: {
          class_id: classId,
          status: 'enrolled',
        },
        attributes: ['user_id'],
      });

      // Grant exam access to students who do not already have it.
      let created = 0;

      for (const enrollment of enrollments) {
        const exists = await ExamUserAccess.findOne({
          where: {
            exam_id: examId,
            user_id: enrollment.user_id,
          },
        });

        if (!exists) {
          await ExamUserAccess.create({
            exam_id: examId,
            user_id: enrollment.user_id,
            max_attempts: 1,
            granted_by: req.user.id,
          });

          created++;
        }
      }

      return res.status(200).json({
        message:
          enrollments.length === 0
            ? `Class assigned, but no enrolled students were found in ${classRecord.name}.`
            : 'Class assigned successfully.',
        exam_id: Number(examId),
        class_id: Number(classId),
        total_students: enrollments.length,
        newly_assigned: created,
      });
    } catch (err) {
      console.error('Assign class to exam error:', err);

      return res.status(500).json({
        message: 'Failed to assign class to exam.',
        error: err.message,
      });
    }
  }
);

/**
 * GET /api/admin/exams/:examId/classes
 *
 * Get all classes assigned to an exam.
 */
router.get(
  '/:examId/classes',
  auth,
  requireRoles(
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES.INSTRUCTOR
  ),
  async (req, res) => {
    const { examId } = req.params;

    try {
      const exam = await Exams.findByPk(examId, {
        include: [
          {
            model: Classes,
            as: 'classes',
            through: {
              attributes: [],
            },
          },
        ],
      });

      if (!exam) {
        return res.status(404).json({
          message: 'Exam not found.',
        });
      }

      let classes = exam.classes;

      // Instructor can only see assigned classes
      // belonging to their own organization.
      if (req.user.roleId === ROLES.INSTRUCTOR) {
        classes = classes.filter(
          (classRecord) =>
            classRecord.organization_id === req.user.organization_id
        );
      }

      // Admin can only see assigned classes belonging
      // to organizations granted through AdminPermissions.
      if (req.user.roleId === ROLES.ADMIN) {
        const permissions = await AdminPermissions.findAll({
          where: {
            admin_id: req.user.id,
          },
          attributes: ['organization_id'],
        });

        const allowedOrganizationIds = permissions.map(
          (permission) => permission.organization_id
        );

        classes = classes.filter((classRecord) =>
          allowedOrganizationIds.includes(classRecord.organization_id)
        );
      }

      return res.status(200).json({
        exam: {
          id: exam.id,
          title: exam.title,
        },
        classes,
      });
    } catch (err) {
      console.error('Get exam classes error:', err);

      return res.status(500).json({
        message: 'Failed to load exam classes.',
        error: err.message,
      });
    }
  }
);

/**
 * DELETE /api/admin/exams/:examId/classes/:classId
 *
 * Remove a class from an exam.
 * 1. Remove the class from exam_class.
 * 2. Remove ExamUserAccess for students enrolled in that class.
 */
router.delete(
  '/:examId/classes/:classId',
  auth,
  requireRoles(
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES.INSTRUCTOR
  ),
  async (req, res) => {
    const { examId, classId } = req.params;

    try {
      // Ensure exam exists.
      const exam = await Exams.findByPk(examId);

      if (!exam) {
        return res.status(404).json({
          message: 'Exam not found.',
        });
      }

      // Ensure class exists.
      const classRecord = await Classes.findByPk(classId);

      if (!classRecord) {
        return res.status(404).json({
          message: 'Class not found.',
        });
      }

      // Instructor can only manage classes
      // belonging to their own organization.
      if (
        req.user.roleId === ROLES.INSTRUCTOR &&
        classRecord.organization_id !== req.user.organization_id
      ) {
        return res.status(403).json({
          message: 'You do not have permission to manage this class.',
        });
      }

      // Admin can only manage classes belonging
      // to organizations granted through AdminPermissions.
      if (req.user.roleId === ROLES.ADMIN) {
        const permission = await AdminPermissions.findOne({
          where: {
            admin_id: req.user.id,
            organization_id: classRecord.organization_id,
          },
        });

        if (!permission) {
          return res.status(403).json({
            message: 'You do not have permission to manage this class.',
          });
        }
      }

      // Make sure this class is actually assigned to the exam.
      const assignedClasses = await exam.getClasses({
        where: {
          id: classRecord.id,
        },
      });

      if (assignedClasses.length === 0) {
        return res.status(404).json({
          message: 'Class is not assigned to this exam.',
        });
      }

      // Find students currently enrolled in this class.
      const enrollments = await ClassEnrollments.findAll({
        where: {
          class_id: classRecord.id,
          status: 'enrolled',
        },
        attributes: ['user_id'],
      });

      const userIds = enrollments.map(
        (enrollment) => enrollment.user_id
      );

      // Remove the Exam <-> Class relationship.
      await exam.removeClass(classRecord);

      // Determine which students should lose exam access.
      //
      // A student may also be enrolled in another class that is still
      // assigned to this exam. In that case, the student must keep access.
      let accessRemoved = 0;

      if (userIds.length > 0) {
        const remainingClasses = await exam.getClasses({
          attributes: ['id'],
        });

        const remainingClassIds = remainingClasses.map(
          (remainingClass) => remainingClass.id
        );

        let userIdsToRemove = userIds;

        if (remainingClassIds.length > 0) {
          const remainingEnrollments = await ClassEnrollments.findAll({
            where: {
              class_id: remainingClassIds,
              user_id: userIds,
              status: 'enrolled',
            },
            attributes: ['user_id'],
          });

          const usersStillCovered = new Set(
            remainingEnrollments.map(
              (enrollment) => enrollment.user_id
            )
          );

          userIdsToRemove = userIds.filter(
            (userId) => !usersStillCovered.has(userId)
          );
        }

        if (userIdsToRemove.length > 0) {
          accessRemoved = await ExamUserAccess.destroy({
            where: {
              exam_id: exam.id,
              user_id: userIdsToRemove,
            },
          });
        }
      }

      return res.status(200).json({
        message: 'Class removed from exam successfully.',
        exam_id: Number(examId),
        class_id: Number(classId),
        total_students: enrollments.length,
        access_removed: accessRemoved,
      });
    } catch (err) {
      console.error('Remove class from exam error:', err);

      return res.status(500).json({
        message: 'Failed to remove class from exam.',
        error: err.message,
      });
    }
  }
);

module.exports = router;