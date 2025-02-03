const router = require('express').Router();
const { Users, Countries } = require('../../../models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const secret = process.env.SECRET;
const refreshSecret = process.env.REFRESH_SECRET;

router.post('/register', async (req, res) => {
    const { first_name, last_name, email, role_id, country_id, city_id, organization_id, password } = req.body;
  try {
    const user = await Users.findOne({ where: { email } });
    if (user) {
      return res.status(400).json({ message: 'email already exists' });
    }

    // Validate the provided country_id
    if (country_id) {
      const country = await Countries.findByPk(country_id);
      if (!country) {
        return res.status(400).json({ message: 'Invalid country ID' });
      }
    }

    const newUser = await Users.create({
        first_name,
        last_name,
        email,
        role_id,
        country_id,
        city_id,
        organization_id,
        //password is hashed before being stored in the database, using a hook in the User model
        password
    });
    const token = jwt.sign(
      { 
        id: newUser.id, 
        email: newUser.email, 
        roleId: newUser.role_id,
        //adding organization_id to the token so it can be used in certain queries
        organization_id: newUser.organization_id,
      }, 
      secret, 
      { expiresIn: '15m' }
    );
    res.status(201).json({ user: newUser, token });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/login', async (req, res) => {
  const { email, password, context } = req.body; // Add "context" to the request body to detect if the request is coming from the general app or the admin dashboard
  try {
    const user = await Users.findOne({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: 'Invalid username or password' });
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(400).json({ message: 'Invalid username or password' });
    }

    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        roleId: user.role_id,
        //adding organization_id to the token so it can be used in certain queries
        organization_id: user.organization_id,
      }, 
      secret, 
      { expiresIn: '15m' }
    );

    // Generate Refresh Token (Longer Expiry)
    const refreshToken = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        roleId: user.role_id,
        organization_id: user.organization_id,
      }, 
      refreshSecret, 
      { expiresIn: '7d' } // Refresh token lasts for 7 days
    );

    console.log('Login successful. Returning access & refresh tokens.');

    res.status(200).json({ 
      message: 'Login successful',
      token, 
      refreshToken,
      user: {
        id: user.id, 
        email: user.email, 
        roleId: user.role_id,
        firstName: user.first_name,
        lastName: user.last_name,
        createdAt: user.createdAt,
      },
     });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Refresh token endpoint
router.post('/refresh-token', (req, res) => {
  const authHeader = req.headers.authorization;

  console.log('Received refresh request');
  console.log('Authorization header:', authHeader);

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('No refresh token provided');
    return res.status(400).json({ message: 'Refresh token is required' });
  }

  const refreshToken = authHeader.split(' ')[1]; // Extract token from header

  try {
    console.log('Verifying refresh token...');
    const decoded = jwt.verify(refreshToken, refreshSecret);

    // Generate a new access token
    const newAccessToken = jwt.sign(
      { id: decoded.id, email: decoded.email, roleId: decoded.roleId, organization_id: decoded.organization_id },
      secret,
      { expiresIn: '15m' } // Keep access tokens short-lived
    );

    // Optionally: Generate a new refresh token
    const newRefreshToken = jwt.sign(
      { id: decoded.id, email: decoded.email, roleId: decoded.roleId, organization_id: decoded.organization_id },
      refreshSecret,
      { expiresIn: '7d' }
    );

    console.log('New access token generated');
    console.log('New refresh token generated');

    // Send back both the new access token and refresh token in the response
    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch (err) {
    console.error('Refresh token error:', err.message);
    return res.status(401).json({ message: 'Invalid refresh token' });
  }
});

router.post('/logout', (req, res) => {
  // Optional: Invalidate token on the client-side by removing it from storage
  // Server-side, tokens are typically stateless and don't need invalidation.
  // Logout function on the front end will likely just remove the token from client storage
  res.status(200).json({ message: 'Logout successful' });
});

module.exports = router;