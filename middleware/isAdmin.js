const jwt = require('jsonwebtoken');
require('dotenv').config();
const { AdminPermissions } = require('../models');

const secret = process.env.SECRET;

const isAdmin = async(req, res, next) => {
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
    // Decode the token
    const decoded = jwt.verify(token, secret);
    console.log('Decoded Token:', decoded); 

    // Check if the user is an admin
    if (decoded.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    // Attach the user object to the request object
    req.user = decoded; 

    // Extract requested filters from query parameters
    const { countryId, cityId, organizationId } = req.query;

    // If no filters are provided, proceed to the next middleware
    if (!countryId && !cityId && !organizationId) {
      return next();
    }

    // Check if the admin has permissions for the requested resources
    const permissions = await AdminPermissions.findAll({
      where: { admin_id: decoded.id },
    });

    const hasPermission = permissions.some((permission) => {
      return (
        (!countryId || permission.country_id === parseInt(countryId)) &&
        (!cityId || permission.city_id === parseInt(cityId)) &&
        (!organizationId || permission.organization_id === parseInt(organizationId))
      );
    });

    if (!hasPermission) {
      return res.status(403).json({ message: 'Access denied for this resource' });
    }
    next();
  } catch (err) {
    console.error('Token verification error:', err.message); 
    res.status(403).json({ message: 'Invalid or expired token' });
  }
  };

module.exports = isAdmin;