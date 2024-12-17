const router = require('express').Router();
const { Users } = require('../../models');
const bcrypt = require('bcryptjs');
const auth = require('../../middleware/auth');
const isAdmin = require('../../middleware/isAdmin');
const { increment } = require('../../models/categories');

router.get('/', isAdmin, async (req, res) => {
  try {
    const users = await Users.findAll({
      attributes: ['id', 'username', 'email', 'is_admin'], 
    });
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', isAdmin, async (req, res) => {
  const { id } = req.user;
  try {
    const user = await Users.findByPk(
      id, 
      {
        attributes: ['id', 'username', 'email', 'is_admin'],
      },
    );
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/', auth, async (req, res) => {
    const { id } = req.user;
    const { username, password, email } = req.body;
  try {
    const user = await Users.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (username) {
        user.username = username;
    }
    if (password) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        user.password = hashedPassword;
    }
    if (email) {
        user.email = email;
    }
    await user.save();
    res.status(200).json({ message: 'User updated successfully', user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/', auth, async (req, res) => {
  try {
    const user = await Users.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    await user.destroy();
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

