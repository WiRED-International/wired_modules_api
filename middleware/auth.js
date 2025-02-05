const jwt = require('jsonwebtoken');
const secret = process.env.SECRET; // Access token secret

const auth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ success: false, message: 'No Authorization header provided' });
  }

  const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;

  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  try {
    if (!secret) {
      throw new Error('JWT secret is missing in environment variables.');
    }

    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    next();
  } catch (err) {
    console.error('Token verification error:', err.message);

    return res.status(401).json({
      success: false,
      error: err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token',
      message: err.name === 'TokenExpiredError' 
        ? 'Your session has expired. Please log in again.' 
        : 'Invalid authentication token provided.'
    });
  }
};

module.exports = auth;