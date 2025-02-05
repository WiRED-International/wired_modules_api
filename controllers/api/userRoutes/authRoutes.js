const router = require('express').Router();
const { Users, Countries } = require('../../../models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const secret = process.env.SECRET;

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
      { expiresIn: '10y' }
    );
    res.status(201).json({ user: newUser, token });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body; // Add "context" to the request body to detect if the request is coming from the general app or the admin dashboard
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
      { expiresIn: '10y' }
    );

    res.status(200).json({ 
      message: 'Login successful',
      token, 
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

router.post('/logout', (req, res) => {
  // Optional: Invalidate token on the client-side by removing it from storage
  // Server-side, tokens are typically stateless and don't need invalidation.
  // Logout function on the front end will likely just remove the token from client storage
  res.status(200).json({ message: 'Logout successful' });
});

module.exports = router;