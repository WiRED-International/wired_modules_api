const jwt = require('jsonwebtoken');
require('dotenv').config();

const secret = process.env.SECRET;

const isAdmin = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }
  
    try {
      const decoded = jwt.verify(token, secret);
      if (!decoded.isAdmin) {
        return res.status(403).json({ message: 'Admin access required' });
      }
      req.user = decoded;
      next();
    } catch (err) {
      res.status(403).json({ message: 'Invalid or expired token' });
    }
  };

module.exports = isAdmin;