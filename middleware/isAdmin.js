const jwt = require('jsonwebtoken');

const {  Users } = require('../models');

const secret = process.env.SECRET;

const isAdmin = async(req, res, next) => {
  try {
    
    if (!req.user || !req.user.id) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const user = await Users.findByPk(req.user.id, { attributes: ['role_id'] });
    const allowedRoles = [2, 3]; 

    if (!user || !allowedRoles.includes(user.role_id)) { 
      return res.status(403).json({ message: 'Admin access required' });
    }

    next();
  } catch (err) {
    console.error('Admin check error:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = isAdmin;