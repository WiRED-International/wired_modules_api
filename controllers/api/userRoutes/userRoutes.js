const router = require('express').Router();
const { Users } = require('../../../models');
const bcrypt = require('bcryptjs');
const auth = require('../../../middleware/auth');
const isAdmin = require('../../../middleware/isAdmin');

router.get('/', isAdmin, async (req, res) => {
  const { countryId, cityId, organizationId } = req.query;

  try {
    const users = await Users.findAll({
      where: {
        country_id: countryId,
        city_id: cityId,
        organization_id: organizationId,
      },
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

    const { countryId, cityId, organizationId } = req.query;
    const hasPermission = req.permissions.some((permission) => {
      return (
        (!countryId || permission.country_id === country_id) &&
        (!cityId || permission.city_id === city_id) &&
        (!organizationId || permission.organization_id === organization_id)
      );
    });

    if (!hasPermission) {
      return res.status(403).json({ message: 'Access denied for this resource' });
    }

    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  const { id } = req.params; 
  const requesterId = req.user.id; 
  const requesterRole = req.user.role; 
  const { firstName, lastName, email } = req.body;

  try {
    const user = await Users.findByPk(id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Restrict non-admins to only update their own data
    if (requesterRole !== 'admin' && requesterId !== parseInt(id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Update allowed fields
    if (firstName) user.first_name = firstName;
    if (lastName) user.last_name = lastName;
    if (email) user.email = email;

    await user.save();
    res.status(200).json({ message: 'User updated successfully', user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  const { id } = req.params; 
  const requesterId = req.user.id; 
  const requesterRole = req.user.role; 

  try {
    const user = await Users.findByPk(id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (requesterRole !== 'admin' && requesterId !== parseInt(id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await user.destroy();
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

