const router = require('express').Router();
const { Users, Countries } = require('../../../models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { create } = require('../../../models/alerts');
require('dotenv').config();

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

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await Users.create({
        first_name,
        last_name,
        email,
        role_id,
        country_id,
        city_id,
        organization_id,
        password: hashedPassword,
    });
    res.status(201).json({ user: newUser });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
  try {
    const user = await Users.findOne({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(400).json({ message: 'Invalid username or password' });
    }
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        roleId: user.role_id
      }, 
      secret, 
      { expiresIn: '1h' }
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
  res.status(200).json({ message: 'Logout successful' });
});

module.exports = router;