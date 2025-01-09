const router = require('express').Router();
const { Users } = require('../../models');
const bcrypt = require('bcryptjs');
const auth = require('../../middleware/auth');
const isAdmin = require('../../middleware/isAdmin');

router.get('/', isAdmin, async (req, res) => {
  try {
    const users = await Users.findAll({
      attributes: ['id', 'first_name', 'last_name', 'email', 'role'], 
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
        attributes: ['id', 'first_name', 'last_name', 'email', 'role'],
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

router.put('/:id', auth, async (req, res) => {
    const { id } = req.user;
    const { firstName, lastname, password, email } = req.body;
  try {
    const user = await Users.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (firstName) {
        user.firstName = firstName;
    }
    if (lastname) {
        user.lastName = lastname;
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

router.delete('/:id', auth, async (req, res) => {
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

