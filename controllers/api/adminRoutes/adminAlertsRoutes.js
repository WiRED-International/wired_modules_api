'use strict';

const router = require('express').Router();
const { Transaction } = require('sequelize');

const Alerts = require('../../../models/alerts');
const sequelize = require('../../../config/connection');
const auth = require('../../../middleware/auth');
const requireRoles = require('../../../middleware/requireRoles');
const ROLES = require('../../../utils/roles');

router.use(auth, requireRoles(ROLES.SUPER_ADMIN));

function validateId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function validateAnnouncement(body) {
  if (
    !body ||
    typeof body.alert !== 'string' ||
    !body.alert.trim()
  ) {
    return 'Announcement text is required.';
  }

  if (typeof body.important !== 'boolean') {
    return 'Important must be true or false.';
  }

  return null;
}

function isRetryableError(error) {
  const code = error?.parent?.code || error?.original?.code;
  return code === 'ER_LOCK_DEADLOCK' ||
    code === 'ER_LOCK_WAIT_TIMEOUT' ||
    code === 'ER_DUP_ENTRY';
}

async function withRetries(operation, maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (!isRetryableError(error) || attempt === maxAttempts) {
        throw error;
      }

      await new Promise((resolve) =>
        setTimeout(resolve, attempt * 100)
      );
    }
  }
}

// Change the active announcement atomically.
async function setActiveAnnouncement(targetId) {
  return withRetries(() =>
    sequelize.transaction(
      {
        isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE,
      },
      async (transaction) => {
        let selected = null;

        if (targetId !== null) {
          selected = await Alerts.findByPk(targetId, {
            transaction,
            lock: transaction.LOCK.UPDATE,
          });

          if (!selected) {
            const error = new Error('Announcement not found.');
            error.status = 404;
            throw error;
          }
        }

        // Clear the previous active announcement.
        await Alerts.update(
          { is_active: false },
          {
            where: { is_active: true },
            transaction,
          }
        );

        // Activate the requested announcement.
        if (selected) {
          await Alerts.update(
            { is_active: true },
            { where: { id: targetId }, transaction }
          );
        }

        return selected;
      }
    )
  );
}

// List announcements, with optional pagination.
router.get('/', async (req, res) => {
  try {
    const order = [
      ['created_at', 'DESC'],
      ['id', 'DESC'],
    ];

    // Preserve the existing response for callers without pagination.
    if (req.query.page === undefined && req.query.limit === undefined) {
      const announcements = await Alerts.findAll({ order });
      return res.json(announcements);
    }

    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 25);

    if (
      !Number.isSafeInteger(page) ||
      page < 1 ||
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      limit > 100
    ) {
      return res.status(400).json({
        message: 'Invalid pagination parameters.',
      });
    }

    const offset = (page - 1) * limit;

    if (!Number.isSafeInteger(offset)) {
      return res.status(400).json({
        message: 'Invalid pagination offset.',
      });
    }

    const { count, rows } = await Alerts.findAndCountAll({
      order,
      limit,
      offset,
    });

    return res.json({
      announcements: rows,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.max(1, Math.ceil(count / limit)),
      },
    });
  } catch (error) {
    console.error('List announcements error:', error);
    return res.status(500).json({
      message: 'Unable to load announcements.',
    });
  }
});

// Create a draft.
router.post('/', async (req, res) => {
  const error = validateAnnouncement(req.body);

  if (error) {
    return res.status(400).json({ message: error });
  }

  try {
    const announcement = await Alerts.create({
      alert: req.body.alert.trim(),
      important: req.body.important,
      is_active: false,
    });

    return res.status(201).json(announcement);
  } catch (error) {
    console.error('Create announcement error:', error);
    return res.status(500).json({
      message: 'Unable to create announcement.',
    });
  }
});

// Deactivate all announcements.
router.put('/deactivate', async (req, res) => {
  try {
    await setActiveAnnouncement(null);

    return res.json({
      message: 'All announcements deactivated.',
    });
  } catch (error) {
    console.error('Deactivate announcements error:', error);
    return res.status(500).json({
      message: 'Unable to deactivate announcements.',
    });
  }
});

// Retrieve one announcement.
router.get('/:id', async (req, res) => {
  const id = validateId(req.params.id);

  if (!id) {
    return res.status(400).json({
      message: 'Invalid announcement ID.',
    });
  }

  try {
    const announcement = await Alerts.findByPk(id);

    if (!announcement) {
      return res.status(404).json({
        message: 'Announcement not found.',
      });
    }

    return res.json(announcement);
  } catch (error) {
    console.error('Get announcement error:', error);
    return res.status(500).json({
      message: 'Unable to load announcement.',
    });
  }
});

// Edit content without changing publication status.
router.put('/:id', async (req, res) => {
  const id = validateId(req.params.id);
  const error = validateAnnouncement(req.body);

  if (!id) {
    return res.status(400).json({
      message: 'Invalid announcement ID.',
    });
  }

  if (error) {
    return res.status(400).json({ message: error });
  }

  try {
    const announcement = await Alerts.findByPk(id);

    if (!announcement) {
      return res.status(404).json({
        message: 'Announcement not found.',
      });
    }

    await announcement.update({
      alert: req.body.alert.trim(),
      important: req.body.important,
    });

    return res.json(announcement);
  } catch (error) {
    console.error('Update announcement error:', error);
    return res.status(500).json({
      message: 'Unable to update announcement.',
    });
  }
});

// Activate an announcement.
router.put('/:id/activate', async (req, res) => {
  const id = validateId(req.params.id);

  if (!id) {
    return res.status(400).json({
      message: 'Invalid announcement ID.',
    });
  }

  try {
    const announcement = await setActiveAnnouncement(id);
    return res.json(announcement);
  } catch (error) {
    console.error('Activate announcement error:', error);

    return res.status(error.status || 500).json({
      message: error.status
        ? error.message
        : 'Unable to activate announcement.',
    });
  }
});

// Delete an announcement.
router.delete('/:id', async (req, res) => {
  const id = validateId(req.params.id);

  if (!id) {
    return res.status(400).json({
      message: 'Invalid announcement ID.',
    });
  }

  try {
    await withRetries(() =>
      sequelize.transaction(
        {
          isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE,
        },
        async (transaction) => {
          const announcement = await Alerts.findByPk(id, {
            transaction,
            lock: transaction.LOCK.UPDATE,
          });

          if (!announcement) {
            const error = new Error('Announcement not found.');
            error.status = 404;
            throw error;
          }

          await announcement.destroy({ transaction });
        }
      )
    );

    return res.json({
      message: 'Announcement deleted successfully.',
    });
  } catch (error) {
    console.error('Delete announcement error:', error);

    return res.status(error.status || 500).json({
      message: error.status
        ? error.message
        : 'Unable to delete announcement.',
    });
  }
});

module.exports = router;
