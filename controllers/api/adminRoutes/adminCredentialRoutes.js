const router = require('express').Router();
const { Op } = require('sequelize');

const auth = require('../../../middleware/auth');
const isSuperAdmin = require('../../../middleware/isSuperAdmin');
const isAdmin = require('../../../middleware/isAdmin');
const ROLES = require('../../../utils/roles');
const issueCredential = require('../../../services/credentials/issueCredential');

const {
  Credentials,
  Users,
  Classes,
  Programs,
  Specializations,
  ClassEnrollments,
  ClassEnrollmentSpecializations,
  AdminPermissions,
} = require('../../../models');

// =====================================================
// GET WIRED CREDENTIAL LEDGER
// =====================================================

router.get('/', auth, isSuperAdmin, async (req, res) => {
  try {
    const page = Number(req.query.page);
    const limit = Number(req.query.limit);

    const query =
      typeof req.query.query === 'string'
        ? req.query.query.trim()
        : '';

    const credentialType =
      typeof req.query.type === 'string'
        ? req.query.type.trim()
        : '';

    const status =
      typeof req.query.status === 'string'
        ? req.query.status.trim()
        : '';

    const usePagination =
      Number.isSafeInteger(page) &&
      page > 0 &&
      Number.isSafeInteger(limit) &&
      limit > 0;

    const where = {};

    if (credentialType) {
      where.credential_type = credentialType;
    }

    if (status) {
      where.status = status;
    }

    if (query) {
      where[Op.or] = [
        {
          student_name_snapshot: {
            [Op.like]: `%${query}%`,
          },
        },
        {
          wired_user_id_snapshot: {
            [Op.like]: `%${query}%`,
          },
        },
        {
          credential_number: {
            [Op.like]: `%${query}%`,
          },
        },
        {
          class_name_snapshot: {
            [Op.like]: `%${query}%`,
          },
        },
        {
          '$program.name$': {
            [Op.like]: `%${query}%`,
          },
        },
        {
          '$specialization.name$': {
            [Op.like]: `%${query}%`,
          },
        },
      ];
    }

    const queryOptions = {
      where,
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
          model: Classes,
          as: 'class',
          attributes: ['id', 'name'],
        },
        {
          model: Programs,
          as: 'program',
          attributes: [
            'id',
            'name',
            'training_type',
          ],
        },
        {
          model: Specializations,
          as: 'specialization',
          attributes: ['id', 'name'],
          required: false,
        },
      ],
      order: [['awarded_at', 'DESC']],
    };

    if (!usePagination) {
      const credentials = await Credentials.findAll(
        queryOptions
      );

      return res.status(200).json(credentials);
    }

    const offset = (page - 1) * limit;

    const { count, rows } =
      await Credentials.findAndCountAll({
        ...queryOptions,
        limit,
        offset,
        distinct: true,
      });

    return res.status(200).json({
      credentials: rows,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.max(
          1,
          Math.ceil(count / limit)
        ),
      },
    });

  } catch (error) {
    console.error(
      'Failed to load credential ledger:',
      error
    );

    return res.status(500).json({
      message: 'Failed to load credential ledger',
      error: error.message,
    });
  }
});

// =====================================================
// GET WIRED CREDENTIAL DETAILS
// =====================================================

router.get('/:credentialId', auth, isSuperAdmin, async (req, res) => {
  try {
    const credentialId = Number(req.params.credentialId);

    if (!Number.isSafeInteger(credentialId) || credentialId <= 0) {
      return res.status(400).json({
        message: 'Valid credentialId is required.',
      });
    }

    const credential = await Credentials.findByPk(credentialId, {
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
          model: Classes,
          as: 'class',
          attributes: [
            'id',
            'name',
            'start_date',
            'end_date',
            'status',
          ],
        },
        {
          model: Programs,
          as: 'program',
          attributes: [
            'id',
            'name',
            'training_type',
          ],
        },
        {
          model: Specializations,
          as: 'specialization',
          attributes: ['id', 'name'],
          required: false,
        },
      ],
    });

    if (!credential) {
      return res.status(404).json({
        message: 'Credential not found.',
      });
    }

    return res.status(200).json(credential);

  } catch (error) {
    console.error('Failed to load credential details:', error);

    return res.status(500).json({
      message: 'Failed to load credential details.',
      error: error.message,
    });
  }
});

// =====================================================
// REVOKE WIRED CREDENTIAL
// =====================================================

router.post('/:credentialId/revoke', auth, isSuperAdmin, async (req, res) => {
  try {
    const credentialId = Number(req.params.credentialId);
    const { reason } = req.body;

    if (!Number.isSafeInteger(credentialId) || credentialId <= 0) {
      return res.status(400).json({
        message: 'Valid credentialId is required.',
      });
    }

    if (typeof reason !== 'string' || !reason.trim()) {
      return res.status(400).json({
        message: 'A revocation reason is required.',
      });
    }

    const credential = await Credentials.findByPk(credentialId);

    if (!credential) {
      return res.status(404).json({
        message: 'Credential not found.',
      });
    }

    if (credential.status === 'revoked') {
      return res.status(409).json({
        message: 'Credential has already been revoked.',
      });
    }

    await credential.update({
      status: 'revoked',
      revoked_at: new Date(),
      revoked_by_user_id: req.user.id,
      revocation_reason: reason.trim(),
    });

    return res.status(200).json({
      message: 'Credential revoked successfully.',
      credential,
    });

  } catch (error) {
    console.error('Credential revocation failed:', error);

    return res.status(500).json({
      message: 'Failed to revoke credential.',
      error: error.message,
    });
  }
});

// =====================================================
// GET STUDENT EARNED SPECIALIZATIONS
// =====================================================

router.get('/students/:userId/earned-specializations', auth, isAdmin, async (req, res) => {
  try {
    const userId = Number(req.params.userId);

    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return res.status(400).json({
        message: 'Valid userId is required.',
      });
    }

    const user = await Users.findByPk(userId, {
      attributes: [
        'id',
        'organization_id',
        'role_id',
      ],
    });

    if (!user) {
      return res.status(404).json({
        message: 'Student not found.',
      });
    }

    if (req.user.roleId === ROLES.ADMIN) {
      const adminPermissions = await AdminPermissions.findAll({
        where: {
          admin_id: req.user.id,
        },
        attributes: ['organization_id'],
      });

      const allowedOrgIds = adminPermissions.map(
        (permission) => permission.organization_id
      );

      if (!allowedOrgIds.includes(user.organization_id)) {
        return res.status(403).json({
          message:
            'Access denied. You can only view users within your assigned organizations.',
        });
      }

      if (user.role_id !== ROLES.USER) {
        return res.status(403).json({
          message:
            "Access denied. Admins can only view users with role 'User'.",
        });
      }
    }

    const credentials = await Credentials.findAll({
      where: {
        user_id: userId,
        credential_type: 'specialization',
        status: 'awarded',
      },
      attributes: [
        'id',
        'credential_number',
        'awarded_at',
        'specialization_id',
      ],
      include: [
        {
          model: Specializations,
          as: 'specialization',
          attributes: ['id', 'name'],
          required: true,
        },
      ],
      order: [['awarded_at', 'DESC']],
    });

    return res.status(200).json({
      specializations: credentials.map((credential) => ({
        credential_id: credential.id,
        credential_number: credential.credential_number,
        awarded_at: credential.awarded_at,
        specialization: credential.specialization,
      })),
    });

  } catch (error) {
    console.error(
      'Failed to load earned specializations:',
      error
    );

    return res.status(500).json({
      message: 'Failed to load earned specializations.',
      error: error.message,
    });
  }
});

// =====================================================
// GET STUDENT CREDENTIALS AND TRAINING ENROLLMENTS
// =====================================================

router.get('/students/:userId', auth, isSuperAdmin, async (req, res) => {
  try {
    const userId = Number(req.params.userId);

    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return res.status(400).json({
        message: 'Valid userId is required.',
      });
    }

    const user = await Users.findByPk(userId, {
      attributes: [
        'id',
        'wired_user_id',
        'first_name',
        'last_name',
      ],
    });

    if (!user) {
      return res.status(404).json({
        message: 'Student not found.',
      });
    }

    const enrollments = await ClassEnrollments.findAll({
      where: {
        user_id: userId,
      },
      include: [
        {
          model: Classes,
          as: 'class',
          required: true,
          attributes: [
            'id',
            'name',
            'status',
            'program_id',
            'start_date',
            'end_date',
          ],
          include: [
            {
              model: Programs,
              as: 'program',
              required: true,
              where: {
                training_type: [
                  'basic',
                  'act',
                  'specialization',
                ],
              },
              attributes: [
                'id',
                'name',
                'training_type',
              ],
            },
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
      order: [['enrolled_at', 'DESC']],
    });

    const credentials = await Credentials.findAll({
      where: {
        user_id: userId,
      },
      include: [
        {
          model: Classes,
          as: 'class',
          attributes: ['id', 'name'],
        },
        {
          model: Programs,
          as: 'program',
          attributes: ['id', 'name', 'training_type'],
        },
        {
          model: Specializations,
          as: 'specialization',
          attributes: ['id', 'name'],
          required: false,
        },
      ],
      order: [['awarded_at', 'DESC']],
    });

    return res.status(200).json({
      user,
      enrollments,
      credentials,
    });

  } catch (error) {
    console.error('Failed to load student credentials:', error);

    return res.status(500).json({
      message: 'Failed to load student credentials.',
      error: error.message,
    });
  }
});

// =====================================================
// RECHECK ELIGIBILITY AND ISSUE WIRED CREDENTIAL
// =====================================================

router.post('/recheck', auth, isSuperAdmin, async (req, res) => {
  try {
    const { userId, classId } = req.body;

    const parsedUserId = Number(userId);
    const parsedClassId = Number(classId);

    if (
      !Number.isSafeInteger(parsedUserId) ||
      parsedUserId <= 0 ||
      !Number.isSafeInteger(parsedClassId) ||
      parsedClassId <= 0
    ) {
      return res.status(400).json({
        message: 'Valid userId and classId are required.',
      });
    }

    const result = await issueCredential({
      userId: parsedUserId,
      classId: parsedClassId,
    });

    if (result.issued) {
      return res.status(201).json({
        message: 'Credential issued successfully.',
        ...result,
      });
    }

    if (result.already_exists) {
      return res.status(200).json({
        message: 'A credential already exists for this student and class.',
        ...result,
      });
    }

    return res.status(200).json({
      message: 'Student does not currently meet credential requirements.',
      ...result,
    });

  } catch (error) {
    console.error('Credential recheck failed:', error);

    res.status(500).json({
      message: 'Failed to recheck credential eligibility.',
      error: error.message,
    });
  }
});

module.exports = router;