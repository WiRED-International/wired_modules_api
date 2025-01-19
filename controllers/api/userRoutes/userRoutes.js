const router = require('express').Router();
const { Users, Roles } = require('../../../models');
const auth = require('../../../middleware/auth');
const isAdmin = require('../../../middleware/isAdmin');
const { Op, fn, col } = require('sequelize');

const validRoles = [1,2,3]

router.get('/', auth, isAdmin, async (req, res) => {
  const { countryId, cityId, organizationId, roleId } = req.query;

  try {
    // Initialize the base `where` clause
    let where = {};

    // Restrict data visibility based on user role
    if (req.user.roleId === 2) {
      
      // Role 2: Can only view users within the same organization
      where.organization_id = req.user.organization_id;

      // Optionally filter within the allowed scope
      where = {
        ...where,
        ...(countryId && { country_id: countryId }),
        ...(cityId && { city_id: cityId }),
        ...(roleId && { role_id: roleId }),
      };
    } else if (req.user.roleId === 3) {
      // Role 3: Can view any user
      where = {
        ...(countryId && { country_id: countryId }),
        ...(cityId && { city_id: cityId }),
        ...(organizationId && { organization_id: organizationId }),
        ...(roleId && { role_id: roleId }),
      };
    } else {
      // Role not recognized, deny access (should not happen due to `isAdmin`)
      return res.status(403).json({ message: 'You do not have permission to view users' });
    }

    // Fetch the users with filters
    const users = await Users.findAll({
      where,
      attributes: ['id', 'first_name', 'last_name', 'email'],
      include: [
        {
          model: Roles,
          as: 'role',
          attributes: ['name'],
        },
      ],
    });

    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/search', auth, isAdmin, async (req, res) => {
  //users can be searched by one or more of the following fields. searches are case-insensitive
  const { email, first_name, last_name } = req.query;

  try {
    // Initialize the base `where` clause
    let whereClause = {};
    // Restrict data visibility based on user role

    if (req.user.roleId === 2) {
      // Role 2: Can only view users within the same organization
      whereClause.organization_id = req.user.organization_id;
    } else if (req.user.roleId !== 3) {
      // Role not recognized, deny access (should not happen due to `isAdmin` middleware)
      return res.status(403).json({ message: 'You do not have permission to search for users' });
    }

    // Add case-insensitive search filters if provided
    if (email) {
      whereClause.email = {
        [Op.like]: `%${email.toLowerCase()}%`,  // Ensure email in the db is compared case-insensitively
      };
    }
    if (first_name) {
      whereClause.first_name = {
        [Op.like]: `%${first_name.toLowerCase()}%`,
      };
    }
    if (last_name) {
      whereClause.last_name = {
        [Op.like]: `%${last_name.toLowerCase()}%`,
      };
    }

    // Fetch the users with filters
    const users = await Users.findAll({
      where: whereClause,  // Use the correct `where` object
      attributes: ['id', 'first_name', 'last_name', 'email'],
      include: [
        {
          model: Roles,
          as: 'role',
          attributes: ['name'],
        },
      ],
    });

    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


router.get('/:id', auth, isAdmin, async (req, res) => {
  const userId = req.params.id;

  try {
    // Find the user by ID
    const user = await Users.findOne({
      where: { id: userId },
      attributes: ['id', 'first_name', 'last_name', 'email', 'organization_id', 'role_id'],
      include: [{ model: Roles, as: 'role', attributes: ['name'] }],
    });

    //

    // Check if user exists
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Role-based access control (role 1 basically cant query any user)
    if (req.user.roleId === 2) {
      // Role 2 can only view users within the same organization
      if (user.organization_id !== req.user.organization_id) {
        return res.status(403).json({ message: 'Access denied, you can only access users from within your organization' });
      }
    } else if (req.user.roleId !== 3) {
      // Role 3 can view any user; other roles cannot
      return res.status(403).json({ message: 'Access denied, invalid role id' });
    }

    // Return the user details
    res.status(200).json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'An error occurred while fetching the user' });
  }
});



router.put('/:id', auth, async (req, res) => {
  const userId = req.user.id; // Authenticated user's ID
  const { id: unparsedTargetUserId } = req.params; // Target user ID
  const updatedData = req.body; // Data to update

  //parse the targetUserId to an integer
  const targetUserId = parseInt(unparsedTargetUserId);

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
      if(!validRoles.includes(user.role_id)){
        return res.status(403).json({
          message: 'Authenticated user role id not recognized',
        });
      }
      if(!validRoles.includes(updatedData.role_id)){
        return res.status(400).json({ message: 'Invalid role_id provided for user being updated' });
      }
      if (user.role_id === 1 || user.role_id === 2) {
        // Role 1: Cannot modify any role_id
        return res.status(403).json({
          message: 'You do not have permission to modify role_id, contact a system admin',
        });
      } 
    }

    // Additional restriction for role_id 1: Only allow them to update themselves
    if ((user.role_id === 1 || user.role_id === 2) && userId !== targetUserId) {
      return res.status(403).json({
        message: 'You are only permitted to update your own user details',
      });
    }


    // Ensure only allowed fields are updated
    const allowedUpdates = ['first_name', 'last_name', 'email', 'password', user.role_id === 3 ? 'role_id' : null, 'country_id', 'city_id', 'organization_id'];
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
  const userId = req.user.id; // Authenticated user's ID
  const { id: targetUserId } = req.params; // Target user ID to delete

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

    // Role-based deletion rules
    if (user.role_id !== 3) {
      // Role 1: No permission to delete anyone
      return res.status(403).json({
        message: 'You do not have permission to delete users',
      });
    }

    // Proceed with deletion
    await targetUser.destroy();

    res.status(200).json({
      message: `User with ID ${targetUserId} deleted successfully`,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


module.exports = router;

