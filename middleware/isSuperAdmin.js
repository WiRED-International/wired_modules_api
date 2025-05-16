const isSuperAdmin = (req, res, next) => {
  if (!req.user || typeof req.user.roleId === 'undefined') {
    return res.status(403).json({ message: 'Super admin access required' });
  }

  if (req.user.roleId !== 3) {
    return res.status(403).json({ message: 'Super admin access required' });
  }

  next();
};

module.exports = isSuperAdmin;
