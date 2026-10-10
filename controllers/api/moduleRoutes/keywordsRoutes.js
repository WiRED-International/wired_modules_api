const router = require('express').Router();

const {
  Keywords,
} = require('../../../models');

const auth = require('../../../middleware/auth');
const requireRoles = require('../../../middleware/requireRoles');
const ROLES = require('../../../utils/roles');

// ============================================
// GET /keywords
// Get all keywords
// ============================================
router.get('/', async (req, res) => {
  try {
    const keywords = await Keywords.findAll({
      attributes: ['id', 'name'],
      order: [['name', 'ASC']],
    });

    res.status(200).json(keywords);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
});

// ============================================
// POST /keywords
// Create a keyword
// Super Admin only
// ============================================
router.post(
  '/',
  auth,
  requireRoles(ROLES.SUPER_ADMIN),
  async (req, res) => {
    try {
      const name =
        typeof req.body.name === 'string'
          ? req.body.name.trim()
          : '';

      if (!name) {
        return res.status(400).json({
          message: 'Keyword name is required.',
        });
      }

      const existingKeyword = await Keywords.findOne({
        where: { name },
      });

      if (existingKeyword) {
        return res.status(409).json({
          message: 'Keyword already exists.',
          keyword: existingKeyword,
        });
      }

      const keyword = await Keywords.create({
        name,
      });

      res.status(201).json({
        message: 'Keyword created successfully.',
        keyword,
      });
    } catch (err) {
      res.status(500).json({
        message: err.message,
      });
    }
  }
);

module.exports = router;