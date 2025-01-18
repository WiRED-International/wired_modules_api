const jwt = require('jsonwebtoken');
require('dotenv').config();

const secret = process.env.SECRET;

const auth = (req, res, next) => {
    const authHeader = req.headers.authorization;
  
    if (!authHeader) {
      return res.status(401).json({ message: 'No Authorization header provided' });
    }
  
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.split(' ')[1] 
      : authHeader;
  
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

  
    try {
      const decoded = jwt.verify(token, secret);
  
      req.user = decoded;
  
      next(); 
    } catch (err) {
      console.error('Token verification error:', err.message); 
      res.status(401).json({ message: 'Invalid or expired token' });
    }
  };

module.exports = auth;