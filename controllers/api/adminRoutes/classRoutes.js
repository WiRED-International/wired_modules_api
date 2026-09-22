const router = require('express').Router();
const { Op } = require('sequelize');
const {
  Classes,
  Programs,
  Organizations,
  Locations,
  Users,
  ClassEnrollments,
  ClassEnrollmentSpecializations,
  Specializations,
  AdminPermissions,
} = require('../../../models');

const auth = require('../../../middleware/auth');
const requireRoles = require('../../../middleware/requireRoles');

const ROLES = require('../../../utils/roles');

router.get(
  '/',
  auth,
  requireRoles(
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES.INSTRUCTOR
  ),
  async (req, res) => {
    try {
      const {
        search,
        programId,
        organizationId,
        locationId,
        status,
        page = '1',
        limit = '25',
      } = req.query;

      const where = {};

      const pageNumber = Number(page);
      const limitNumber = Number(limit);

      if (
        !Number.isInteger(pageNumber) ||
        pageNumber < 1
      ) {
        return res.status(400).json({
          message: 'Page must be a positive integer.',
        });
      }

      if (
        !Number.isInteger(limitNumber) ||
        limitNumber < 1 ||
        limitNumber > 100
      ) {
        return res.status(400).json({
          message: 'Limit must be an integer between 1 and 100.',
        });
      }

      const offset = (pageNumber - 1) * limitNumber;

      // Instructor → classes from their own organization
      if (req.user.roleId === ROLES.INSTRUCTOR) {
        if (!req.user.organization_id) {
          return res.status(400).json({
            message: 'Instructor is not assigned to an organization.',
          });
        }

        where.organization_id = req.user.organization_id;
      }

      // Admin → classes from organizations assigned through AdminPermissions
      if (req.user.roleId === ROLES.ADMIN) {
        const permissions = await AdminPermissions.findAll({
          where: {
            admin_id: req.user.id,
          },
          attributes: ['organization_id'],
        });

        const organizationIds = permissions
          .map((permission) => permission.organization_id)
          .filter(Boolean);

        if (organizationIds.length === 0) {
          return res.status(403).json({
            message: 'No organization access assigned to this admin.',
          });
        }

        where.organization_id = {
          [Op.in]: organizationIds,
        };
      }

      // Super Admin → no organization filter

      // Class name search
      if (search && String(search).trim()) {
        where.name = {
          [Op.like]: `%${String(search).trim()}%`,
        };
      }

      // Program filter
      if (programId) {
        where.program_id = programId;
      }

      // Organization filter
      if (organizationId) {
        const requestedOrganizationId = Number(organizationId);

        // Instructor may only filter within their own organization.
        if (
          req.user.roleId === ROLES.INSTRUCTOR &&
          requestedOrganizationId !== Number(req.user.organization_id)
        ) {
          return res.status(403).json({
            message: 'You do not have permission to view classes for this organization.',
          });
        }

        // Admin may only filter organizations assigned through AdminPermissions.
        if (req.user.roleId === ROLES.ADMIN) {
          const permissions = await AdminPermissions.findAll({
            where: {
              admin_id: req.user.id,
            },
            attributes: ['organization_id'],
          });

          const organizationIds = permissions
            .map((permission) => Number(permission.organization_id))
            .filter(Boolean);

          if (!organizationIds.includes(requestedOrganizationId)) {
            return res.status(403).json({
              message: 'You do not have permission to view classes for this organization.',
            });
          }
        }

        where.organization_id = requestedOrganizationId;
      }

      // Location filter
      if (locationId) {
        where.location_id = locationId;
      }

      // Status filter
      if (status) {
        const allowedStatuses = [
          'draft',
          'active',
          'completed',
          'archived',
        ];

        if (!allowedStatuses.includes(String(status))) {
          return res.status(400).json({
            message: 'Invalid class status.',
          });
        }

        where.status = status;
      }

      const { count, rows: classes } = await Classes.findAndCountAll({
        where,
        distinct: true,
        limit: limitNumber,
        offset,
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
            model: Locations,
            as: 'location',
          },
          {
            model: Users,
            as: 'created_by_user',
            attributes: ['id', 'first_name', 'last_name', 'email'],
          },
          {
            model: ClassEnrollments,
            as: 'class_enrollments',
            attributes: ['id'],
          },
        ],
        order: [['start_date', 'DESC']],
      });

      return res.status(200).json({
        classes,
        pagination: {
          page: pageNumber,
          limit: limitNumber,
          total: count,
          totalPages: Math.ceil(count / limitNumber),
        },
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
    requireRoles(
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES.INSTRUCTOR
  ),
  async (req, res) => {
    try {
      const {
        organization_id,
        program_id,
        location_id,
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

      // Super Admin can create a class for any organization.
      if (req.user.roleId === ROLES.SUPER_ADMIN) {
        if (!organization_id) {
          return res.status(400).json({
            message: 'Organization is required.',
          });
        }

        organizationId = organization_id;
      }

      // Admin can create a class only for an organization
      // assigned through AdminPermissions.
      else if (req.user.roleId === ROLES.ADMIN) {
        if (!organization_id) {
          return res.status(400).json({
            message: 'Organization is required.',
          });
        }

        const permission = await AdminPermissions.findOne({
          where: {
            admin_id: req.user.id,
            organization_id,
          },
        });

        if (!permission) {
          return res.status(403).json({
            message: 'You do not have permission to create a class for this organization.',
          });
        }

        organizationId = organization_id;
      }

      // Instructor is always restricted to their own organization.
      else {
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

      const allowedClassTrainingTypes = [
        'basic',
        'act',
        'specialization',
      ];

      if (!allowedClassTrainingTypes.includes(program.training_type)) {
        return res.status(400).json({
          message: 'This program cannot be used to create a class.',
        });
      }

      // Validate dates
      if (new Date(end_date) < new Date(start_date)) {
        return res.status(400).json({
          message: 'End date cannot be before start date.',
        });
      }

      if (
        enrollment_deadline &&
        new Date(enrollment_deadline) > new Date(end_date)
      ) {
        return res.status(400).json({
          message: 'Enrollment deadline cannot be after class end date.',
        });
      }

      // Verify location exists if one was provided.
      if (location_id) {
        const location = await Locations.findByPk(location_id);

        if (!location) {
          return res.status(404).json({
            message: 'Location not found.',
          });
        }
      }

      // Create class
      const newClass = await Classes.create({
        organization_id: organizationId,
        program_id,
        location_id: location_id || null,
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
            model: Locations,
            as: 'location',
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

router.put(
  '/:classId',
  auth,
  requireRoles(
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES.INSTRUCTOR
  ),
  async (req, res) => {
    try {
      const { classId } = req.params;

      const {
        program_id,
        location_id,
        name,
        description,
        start_date,
        end_date,
        enrollment_deadline,
        status,
      } = req.body;

      // Find the class first.
      const classRecord = await Classes.findByPk(classId);

      if (!classRecord) {
        return res.status(404).json({
          message: 'Class not found.',
        });
      }

      // Instructor can only manage classes belonging
      // to their organization.
      if (
        req.user.roleId === ROLES.INSTRUCTOR &&
        classRecord.organization_id !== req.user.organization_id
      ) {
        return res.status(403).json({
          message: 'You do not have permission to manage this class.',
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
            message: 'You do not have permission to manage this class.',
          });
        }
      }

      // Archived classes are locked from instructor and admin editing.
      // Super Admins can still edit or restore archived classes.
      if (
        (req.user.roleId === ROLES.INSTRUCTOR ||
          req.user.roleId === ROLES.ADMIN) &&
        classRecord.status === 'archived'
      ) {
        return res.status(403).json({
          message: 'Archived classes cannot be edited.',
        });
      }

      // Validate program if it is being changed.
      if (program_id !== undefined) {
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

        const allowedClassTrainingTypes = [
          'basic',
          'act',
          'specialization',
        ];

        if (!allowedClassTrainingTypes.includes(program.training_type)) {
          return res.status(400).json({
            message: 'This program cannot be used for a class.',
          });
        }
      }

      // Validate location if it is being changed.
      if (location_id !== undefined && location_id !== null) {
        const location = await Locations.findByPk(location_id);

        if (!location) {
          return res.status(404).json({
            message: 'Location not found.',
          });
        }
      }

      // Validate status if it is being changed.
      const allowedStatuses = [
        'draft',
        'active',
        'completed',
        'archived',
      ];

      if (
        status !== undefined &&
        !allowedStatuses.includes(status)
      ) {
        return res.status(400).json({
          message: 'Invalid class status.',
        });
      }

      // Determine the resulting dates so partial updates
      // can still be validated correctly.
      const resultingStartDate =
        start_date !== undefined
          ? start_date
          : classRecord.start_date;

      const resultingEndDate =
        end_date !== undefined
          ? end_date
          : classRecord.end_date;

      if (
        resultingStartDate &&
        resultingEndDate &&
        new Date(resultingEndDate) < new Date(resultingStartDate)
      ) {
        return res.status(400).json({
          message: 'End date cannot be before start date.',
        });
      }

      const resultingEnrollmentDeadline =
        enrollment_deadline !== undefined
          ? enrollment_deadline
          : classRecord.enrollment_deadline;

      if (
        resultingEnrollmentDeadline &&
        resultingEndDate &&
        new Date(resultingEnrollmentDeadline) > new Date(resultingEndDate)
      ) {
        return res.status(400).json({
          message: 'Enrollment deadline cannot be after class end date.',
        });
      }

      // Build only the fields supplied by the request.
      const updates = {};

      if (program_id !== undefined) {
        updates.program_id = program_id;
      }

      if (location_id !== undefined) {
        updates.location_id = location_id;
      }

      if (name !== undefined) {
        if (!String(name).trim()) {
          return res.status(400).json({
            message: 'Class name cannot be empty.',
          });
        }

        updates.name = String(name).trim();
      }

      if (description !== undefined) {
        updates.description =
          String(description).trim() || null;
      }

      if (start_date !== undefined) {
        updates.start_date = start_date;
      }

      if (end_date !== undefined) {
        updates.end_date = end_date;
      }

      if (enrollment_deadline !== undefined) {
        updates.enrollment_deadline =
          enrollment_deadline || null;
      }

      if (status !== undefined) {
        updates.status = status;
      }

      await classRecord.update(updates);

      // Return the updated class with the same related
      // information used by the other class routes.
      const updatedClass = await Classes.findByPk(classRecord.id, {
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
            model: Locations,
            as: 'location',
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

      return res.status(200).json({
        message: 'Class updated successfully.',
        class: updatedClass,
      });
    } catch (err) {
      console.error('Update class error:', err);

      return res.status(500).json({
        message: err.message,
      });
    }
  }
);

router.post(
  '/:classId/enrollments',
  auth,
  requireRoles(
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES.INSTRUCTOR
  ),
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
            message: 'You do not have permission to manage this class.',
          });
        }
      }

      if (classRecord.status === 'archived') {
        return res.status(400).json({
          message: 'Students cannot be enrolled in an archived class.',
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
  '/options/programs',
  auth,
  requireRoles(
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES.INSTRUCTOR
  ),
  async (req, res) => {
    try {
      const programs = await Programs.findAll({
        where: {
          active: true,
          training_type: {
            [Op.in]: ['basic', 'act', 'specialization'],
          },
        },
        attributes: [
          'id',
          'name',
          'training_type',
          'description',
        ],
        order: [['name', 'ASC']],
      });

      return res.status(200).json({
        programs,
      });
    } catch (err) {
      console.error('Get class program options error:', err);

      return res.status(500).json({
        message: err.message,
      });
    }
  }
);

router.get(
  '/:classId',
  auth,
  requireRoles(
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES.INSTRUCTOR
  ),
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
            model: Locations,
            as: 'location',
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
  requireRoles(
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES.INSTRUCTOR
  ),
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

      // Admin can only view class enrollments for
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
  requireRoles(
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES.INSTRUCTOR
  ),
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
            message: 'You do not have permission to manage this class.',
          });
        }
      }

      if (classRecord.status === 'archived') {
        return res.status(400).json({
          message: 'Students cannot be removed from an archived class.',
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

router.get(
  '/:classId/students/search',
  auth,
  requireRoles(
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES.INSTRUCTOR
  ),
  async (req, res) => {
    try {
      const { classId } = req.params;
      const { query = '' } = req.query;

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
            message: 'You do not have permission to manage this class.',
          });
        }
      }

      const searchTerm = String(query).trim();

      const where = {
        role_id: ROLES.USER,
      };

      if (searchTerm) {
        const searchTerms = searchTerm
          .split(/\s+/)
          .filter(Boolean);

        where[Op.and] = searchTerms.map((term) => ({
          [Op.or]: [
            {
              first_name: {
                [Op.like]: `%${term}%`,
              },
            },
            {
              last_name: {
                [Op.like]: `%${term}%`,
              },
            },
            {
              email: {
                [Op.like]: `%${term}%`,
              },
            },
            {
              wired_user_id: {
                [Op.like]: `%${term}%`,
              },
            },
          ],
        }));
      }

      const users = await Users.findAll({
        where,
        attributes: [
          'id',
          'wired_user_id',
          'first_name',
          'last_name',
          'email',
          'organization_id',
        ],
        order: [
          ['last_name', 'ASC'],
          ['first_name', 'ASC'],
        ],
        limit: 20,
      });

      return res.status(200).json({
        users,
      });
    } catch (err) {
      console.error('Search class students error:', err);

      return res.status(500).json({
        message: err.message,
      });
    }
  }
);

module.exports = router;