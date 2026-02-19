const router = require('express').Router();
const { Users, CmeCertificates } = require('../../../models');
const auth = require('../../../middleware/auth');
const ROLES = require('../../../utils/roles');
const calculateCmeCredits = require('../../../services/certificates/calculateCmeCredits');
const issueCmeCertificate = require('../../../services/certificates/issueCmeCertificate');

// POST /certificates/issue
// Body: { user_id, year, issued_at, pdf_path? }
router.post('/issue', auth, async (req, res) => {
  try {
    // ✅ Admin-only issuance (Option A)
    const userIsAdmin =
      req.user &&
      (req.user.roleId === ROLES.ADMIN || req.user.roleId === ROLES.SUPER_ADMIN);

    if (!userIsAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { user_id, year, issued_at, pdf_path } = req.body;

    if (!user_id || !year || !issued_at) {
      return res.status(400).json({
        message: 'user_id, year, and issued_at are required',
      });
    }

    // ✅ Ensure user exists
    const user = await Users.findByPk(user_id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // 🔒 STEP 3 — Enforce 50 CME credits (dynamic)
    const { credits, moduleCount } = await calculateCmeCredits(user_id, year);

    if (credits < 50) {
      return res.status(403).json({
        message: 'User has not met CME credit requirement',
        required: 50,
        earned: credits,
        qualifying_modules: moduleCount,
      });
    }

    // 🔒 STEP 4A — Idempotency guard
    const existing = await CmeCertificates.findOne({
      where: { user_id, year },
    });

    if (existing) {
      return res.status(200).json({
        message: 'Certificate already issued for this user/year',
        certificate: existing,
      });
    }

    // 🔐 STEP 4C — Transaction-safe issuance
    const certificate = await issueCmeCertificate({
      user_id,
      year,
      issued_at,
      pdf_path,
    });

    return res.status(201).json({
      message: 'CME certificate issued',
      certificate,
    });

  } catch (err) {
    console.error('❌ Issue certificate failed:', err);

    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({
        message: 'Duplicate certificate (unique constraint)',
      });
    }

    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

module.exports = router;

