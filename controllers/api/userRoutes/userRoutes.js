const router = require('express').Router();
const { Users, Roles } = require('../../../models');
const bcrypt = require('bcryptjs');
const auth = require('../../../middleware/auth');
const isAdmin = require('../../../middleware/isAdmin');

router.get('/', auth, isAdmin, async (req, res) => {
  const { countryId, cityId, organizationId, roleId } = req.query;

  try {
    const where = req.user.roleId === 2
      ? {
          ...(countryId && { country_id: countryId }),
          ...(cityId && { city_id: cityId }),
          ...(organizationId && { organization_id: organizationId }),
          ...(roleId && { role_id: roleId }),
        }
      : {}; // Super Admins see all

    const users = await Users.findAll({
      where,
      attributes: ['id', 'first_name', 'last_name', 'email'],
      include: [{ model: Roles, as: 'role', attributes: ['name'] }],
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
        attributes: ['id', 'first_name', 'last_name', 'email'],
      },
    );
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { countryId, cityId, organizationId, roleId } = req.query;
    const hasPermission = req.permissions.some((permission) => {
      return (
        (!countryId || permission.country_id === countryId) &&
        (!cityId || permission.city_id === cityId) &&
        (!organizationId || permission.organization_id === organizationId)&&
        (!roleId || permission.role_id === roleId)
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
  const requesterRoleId = req.user.roleId;
  const { firstName, lastName, email, roleId } = req.body;

  try {
    const user = await Users.findByPk(id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Restrict non-admins to only update their own data
    if (requesterRoleId !== 2 && requesterId !== parseInt(id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Update allowed fields
    if (firstName) user.first_name = firstName;
    if (lastName) user.last_name = lastName;
    if (email) user.email = email;

    // Update role if user is a super admin
    if (roleId && requesterRoleId === 3) {
      const role = await Roles.findByPk(roleId);
      if (!role) {
        return res.status(400).json({ message: 'Invalid role ID' });
      }
      user.role_id = roleId;
    }

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

