const isAdmin = (req, res, next) => {
  if (!req.user || typeof req.user.roleId === 'undefined') {
    return res.status(403).json({ message: 'Admin access required' });
  }

  const allowedRoles = [2, 3]; // 2: Admin, 3: Super Admin
  if (!allowedRoles.includes(req.user.roleId)) {
    return res.status(403).json({ message: 'Admin access required' });
  }

  next();
};

module.exports = isAdmin;
