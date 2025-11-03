const ROLES = require('../utils/roles');

const isAdmin = (req, res, next) => {
  if (!req.user || typeof req.user.roleId === 'undefined') {
    return res.status(403).json({ message: 'Admin access required' });
  }

  const allowedRoles = [ROLES.ADMIN, ROLES.SUPER_ADMIN]; // 2: Admin, 3: Super Admin
  if (!allowedRoles.includes(req.user.roleId)) {
    return res.status(403).json({ message: 'Admin access required' });
  }
  console.log("🔍 Decoded JWT:", req.user);
  next();
};

module.exports = isAdmin;
