const router = require('express').Router();
const { Users } = require('../../models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const secret = process.env.SECRET;

router.post('/register', async (req, res) => {
    const { username, password, email, is_admin } = req.body;
  try {
    const user = await Users.findOne({ where: { username } });
    if (user) {
      return res.status(400).json({ message: 'Username already exists' });
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const newUser = await Users.create({
        username,
        password: hashedPassword,
        email,
        is_admin: is_admin || false,
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
    const token = jwt.sign({ id: user.id, email: user.email, isAdmin: user.is_admin }, secret, {
        expiresIn: '1h',
    });
    res.status(200).json({ message: 'Login successful', token, user });
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