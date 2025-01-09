const jwt = require('jsonwebtoken');
require('dotenv').config();

const secret = process.env.SECRET;

const isAdmin = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    console.log('No Authorization header provided');
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    console.log('Malformed Authorization header');
    return res.status(401).json({ message: 'Invalid authorization header format' });
  }

  try {
    const decoded = jwt.verify(token, secret);
    console.log('Decoded Token:', decoded); 

    if (decoded.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    req.user = decoded; 
    next();
  } catch (err) {
    console.error('Token verification error:', err.message); 
    res.status(403).json({ message: 'Invalid or expired token' });
  }
  };

module.exports = isAdmin;