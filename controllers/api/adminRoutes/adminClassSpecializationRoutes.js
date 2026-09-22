const router = require('express').Router();

const {
  Classes,
  Programs,
  ClassEnrollments,
  ClassEnrollmentSpecializations,
  Specializations,
  Users,
  AdminPermissions,
} = require('../../../models');

const auth = require('../../../middleware/auth');
const requireRoles = require('../../../middleware/requireRoles');
const ROLES = require('../../../utils/roles');

router.get(
  '/:classId/specializations',
  auth,
  requireRoles(
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES.INSTRUCTOR
  ),
  async (req, res) => {
    try {
      const { classId } = req.params;

      const classRecord = await Classes.findByPk(classId);

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
          message:
            'You do not have permission to view this class.',
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
            message:
              'You do not have permission to view this class.',
          });
        }
      }

      const specializations = await Specializations.findAll({
        attributes: ['id', 'name'],
        order: [['name', 'ASC']],
      });

      return res.status(200).json({
        specializations,
      });
    } catch (err) {
      console.error(
        'Get class specialization options error:',
        err
      );

      return res.status(500).json({
        message: err.message,
      });
    }
  }
);

router.get(
  '/:classId/enrollment-specializations',
  auth,
  requireRoles(
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES.INSTRUCTOR
  ),
  async (req, res) => {
    try {
      const { classId } = req.params;

      const classRecord = await Classes.findByPk(classId);

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
          message:
            'You do not have permission to view this class.',
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
            message:
              'You do not have permission to view this class.',
          });
        }
      }

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
                attributes: ['id', 'name'],
              },
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
      console.error(
        'Get class enrollment specializations error:',
        err
      );

      return res.status(500).json({
        message: err.message,
      });
    }
  }
);

router.put(
  '/:classId/enrollments/:enrollmentId/specialization',
  auth,
  requireRoles(
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES.INSTRUCTOR
  ),
  async (req, res) => {
    try {
      const { classId, enrollmentId } = req.params;
      const { specialization_id } = req.body;

      if (!specialization_id) {
        return res.status(400).json({
          message: 'Specialization ID is required.',
        });
      }

      // Find the class.
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
            'Specializations can only be assigned to specialization classes.',
        });
      }

      // Archived classes have a locked roster.
      if (classRecord.status === 'archived') {
        return res.status(400).json({
          message:
            'Specializations cannot be changed for an archived class.',
        });
      }

      // Instructor can only manage classes belonging
      // to their organization.
      if (
        req.user.roleId === ROLES.INSTRUCTOR &&
        classRecord.organization_id !== req.user.organization_id
      ) {
        return res.status(403).json({
          message:
            'You do not have permission to manage this class.',
        });
      }

      // Admin can only manage classes belonging to
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
            message:
              'You do not have permission to manage this class.',
          });
        }
      }

      // Verify that this enrollment actually belongs
      // to this class.
      const enrollment = await ClassEnrollments.findOne({
        where: {
          id: enrollmentId,
          class_id: classRecord.id,
        },
      });

      if (!enrollment) {
        return res.status(404).json({
          message: 'Class enrollment not found.',
        });
      }

      // Verify the requested specialization exists.
      const specialization = await Specializations.findByPk(
        specialization_id
      );

      if (!specialization) {
        return res.status(404).json({
          message: 'Specialization not found.',
        });
      }

      // One specialization per class enrollment.
      // If one already exists, change it.
      // Otherwise create it.
      let selection =
        await ClassEnrollmentSpecializations.findOne({
          where: {
            class_enrollment_id: enrollment.id,
          },
        });

      if (selection) {
        await selection.update({
          specialization_id: specialization.id,
          selected_at: new Date(),
        });
      } else {
        selection =
          await ClassEnrollmentSpecializations.create({
            class_enrollment_id: enrollment.id,
            specialization_id: specialization.id,
            status: 'active',
          });
      }

      const updatedSelection =
        await ClassEnrollmentSpecializations.findByPk(
          selection.id,
          {
            include: [
              {
                model: Specializations,
                as: 'specialization',
                attributes: ['id', 'name'],
              },
            ],
          }
        );

      return res.status(200).json({
        message:
          'Student specialization saved successfully.',
        specialization_selection: updatedSelection,
      });
    } catch (err) {
      console.error(
        'Save class enrollment specialization error:',
        err
      );

      return res.status(500).json({
        message: err.message,
      });
    }
  }
);

module.exports = router;