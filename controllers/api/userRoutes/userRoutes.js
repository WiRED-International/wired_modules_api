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
      include: [{ model: Roles, as: 'role', attributes: ['id', 'name'] }],
    });

    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', auth, isAdmin, async (req, res) => {
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
  const userId = req.user.id; // Authenticated user's ID
  const { id: targetUserId } = req.params; // Target user ID
  const updatedData = req.body; // Data to update

  try {
    // Fetch the authenticated user
    const user = await Users.findByPk(userId);

    if (!user) {
      return res.status(404).json({ message: 'Authenticated user not found' });
    }

    // Fetch the target user
    const targetUser = await Users.findByPk(targetUserId);

    if (!targetUser) {
      return res.status(404).json({ message: 'Target user not found' });
    }

    // Restrict modifications based on user roles
    if (updatedData.role_id !== undefined) {
      if (user.role_id === 1) {
        // Role 1: Cannot modify any role_id
        return res.status(403).json({
          message: 'You do not have permission to modify role_id',
        });
      } else if (user.role_id === 2) {
        // Role 2: Can only modify users within the same organization and set role_id 1 or 2
        if (user.organization_id !== targetUser.organization_id) {
          return res.status(403).json({
            message: 'You can only modify users within your organization',
          });
        }
        if (![1, 2].includes(updatedData.role_id)) {
          return res.status(403).json({
            message: 'You can only assign role_id 1 or 2 to users within your organization',
          });
        }
      } else if (user.role_id === 3) {
        // Role 3: Can modify anyone's role_id to 1, 2, or 3
        if (![1, 2, 3].includes(updatedData.role_id)) {
          return res.status(400).json({
            message: 'Invalid role_id. Must be 1, 2, or 3',
          });
        }
      } else {
        return res.status(403).json({
          message: 'Authenticated user role id not recognized',
        });
      }
    }


    // Ensure only allowed fields are updated
    const allowedUpdates = ['first_name', 'last_name', 'email', 'password', 'role_id', 'country_id', 'city_id', 'organization_id'];
    const filteredUpdates = Object.keys(updatedData)
      .filter((key) => allowedUpdates.includes(key))
      .reduce((obj, key) => {
        obj[key] = updatedData[key];
        return obj;
      }, {});

    // Perform the update
    await targetUser.update(filteredUpdates);

    // Fetch the updated user with excluded sensitive fields
    const updatedUser = await Users.findByPk(targetUserId, {
      attributes: { exclude: ['password'] }, // Exclude sensitive fields
    });

    res.status(200).json({
      message: 'User updated successfully',
      user: updatedUser,
    });
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

