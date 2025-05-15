const router = require("express").Router();
const { Users, Roles, QuizScores, Modules, Countries, Cities, Organizations, Specializations } = require('../../../models');
const auth = require("../../../middleware/auth");
const isAdmin = require("../../../middleware/isAdmin");
const isSuperAdmin = require("../../../middleware/isSuperAdmin");
const { buildUserQueryFilters } = require("../../../middleware/accessControl");
const { Op } = require("sequelize");

const USER_ROLE_ID = 1;
const ADMIN_ROLE_ID = 2;
const SUPER_ADMIN_ROLE_ID = 3;
const validRoles = [1, 2, 3];

router.get("/", auth, isAdmin, async (req, res) => {
  const { countryId, cityId, organizationId, roleId } = req.query;

  try {
    const where = buildUserQueryFilters(req, { countryId, cityId, organizationId, roleId });

    const users = await Users.findAll({
      where,
      attributes: ["id", "first_name", "last_name", "email",],
      include: [
        { model: Organizations,
          as: "organization",
          attributes: ["name"],
        },
        { model: Roles, 
          as: "role", 
          attributes: ["name"], 
        },
        { model: Countries, 
          as: "country", 
          attributes: ["name"], 
        },
        { model: Cities,
          as: "city",
          attributes: ["name"],
        },
        { 
          model: QuizScores, 
          as: 'quizScores', 
          attributes: ['score', 'date_taken'],
          include: [
            {
              model: Modules, 
              as: 'module', 
              attributes: ['name', 'module_id',],
            },
          ],
        },
        {
          model: Specializations,
          as: 'specializations',
          attributes: ['name'],
        }
      ],
    });

    return res.status(200).json(users);
  } catch (err) {
    console.error(err);
    return res.status(403).json({ message: err.message });
  }
});


router.get('/me', auth, async (req, res) => {
  try {
    // Fetch the authenticated user's details
    const user = await Users.findByPk(req.user.id, {
      attributes: ['id', 'first_name', 'last_name', 'email', 'createdAt'], 
      include: [
        { 
          model: QuizScores, 
          as: 'quizScores', 
          attributes: ['score', 'date_taken'],
          include: [
            {
              model: Modules, 
              as: 'module', 
              attributes: ['id', 'name', 'module_id',],
            },
          ],
        },
        {
          model: Countries,
          as: 'country',
          attributes: ['name'],
        },
      ],
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json(user);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: err.message });
  }
});

router.get("/search", auth, isAdmin, async (req, res) => {
  //users can be searched by one or more of the following fields. searches are case-insensitive
  const { email, first_name, last_name, countryId, cityId, organizationId, roleId } = req.query;

  try {
    const where = buildUserQueryFilters(req, { countryId, cityId, organizationId, roleId });

    // Add case-insensitive search filters if provided
    if (email) {
      where.email = { [Op.like]: '%' + email + '%' }
    }

    if (first_name) {
      where.first_name = { [Op.like]: '%' + first_name + '%' }
    }

    if (last_name) {
      where.last_name = { [Op.like]: '%' + last_name + '%' }
    }

    // Fetch the users with filters
    const users = await Users.findAll({
      where, // Use the correct `where` object
      attributes: ["id", "first_name", "last_name", "email",],
      include: [
        { model: Organizations,
          as: "organization",
          attributes: ["name"],
        },
        { model: Roles, 
          as: "role", 
          attributes: ["name"], 
        },
        { model: Countries, 
          as: "country", 
          attributes: ["name"], 
        },
        { model: Cities,
          as: "city",
          attributes: ["name"],
        },
        { 
          model: QuizScores, 
          as: 'quizScores', 
          attributes: ['score', 'date_taken'],
          include: [
            {
              model: Modules, 
              as: 'module', 
              attributes: ['name', 'module_id',],
            },
          ],
        },
        {
          model: Specializations,
          as: 'specializations',
          attributes: ['name'],
        }
      ],
    });

    return res.status(200).json(users);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: err.message });
  }
});

router.get("/:id", auth, isAdmin, async (req, res) => {
  const targetUserId = req.params.id;

  try {
    // Find the user by ID
    const user = await Users.findOne({
      where: { id: targetUserId },
      attributes: [
        "id",
        "first_name",
        "last_name",
        "email",
      ],
      include: [
        { model: Organizations,
          as: "organization",
          attributes: ["name"],
        },
        { model: Roles, 
          as: "role", 
          attributes: ["name"], 
        },
        { model: Countries, 
          as: "country", 
          attributes: ["name"], 
        },
        { model: Cities,
          as: "city",
          attributes: ["name"],
        },
        { 
          model: QuizScores, 
          as: 'quizScores', 
          attributes: ['score', 'date_taken'],
          include: [
            {
              model: Modules, 
              as: 'module', 
              attributes: ['name', 'module_id',],
            },
          ],
        },
        {
          model: Specializations,
          as: 'specializations',
          attributes: ['name'],
        }
      ],
    });

    // Check if user exists
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const requester = req.user;

    if (requester.roleId === ADMIN_ROLE_ID) {
      if (user.organization_id !== requester.organization_id || user.country_id !== requester.country_id) {
        return res.status(403).json({ message: "Access denied. You can only view users within your assigned organization and country." });
      }

      // Optional city restriction
      if (requester.city_id && user.city_id !== requester.city_id) {
        return res.status(403).json({ message: "Access denied. You can only view users within your assigned city." });
      }

      // Role restriction
      if (user.role_id !== USER_ROLE_ID) {
        return res.status(403).json({ message: "Access denied. Admins can only view users with role 'User'." });
      }
    }

    return res.status(200).json(user);
  } catch (err) {
    console.error(err);
    return res.status(403).json({ message: err.message });
  }
});

// this route is for updating the user's OWN information
router.put("/", auth, async (req, res) => {
  const userId = req.user.id; // Authenticated user's ID
  const updatedData = req.body; // Data to update

  try {
    // Fetch the authenticated user
    const user = await Users.findByPk(userId);

    if (!user) {
      return res.status(404).json({ message: "Authenticated user not found" });
    }

    // Ensure only allowed fields are updated
    // user should not be allowed to update their role_id, organization_id, city_id, or country_id
    const allowedUpdates = [
      "first_name",
      "last_name",
      "email",
      "password",
    ];
    const filteredUpdates = Object.keys(updatedData)
      .filter((key) => allowedUpdates.includes(key))
      .reduce((obj, key) => {
        obj[key] = updatedData[key];
        return obj;
      }, {});
    // if no valid updates are provided
    if (Object.keys(filteredUpdates).length === 0) {
      return res.status(400).json({ message: "No valid updates provided" });
    }
    // Perform the update
    await user.update(filteredUpdates);

    // Fetch the updated user with excluded sensitive fields
    const updatedUser = await Users.findByPk(userId, {
      attributes: { exclude: ["password"] }, // Exclude sensitive fields
    });

    res.status(200).json({
      message: "User updated successfully",
      user: updatedUser,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: err.message });
  }
})

// this route is for updating OTHER users only.
router.put("/:id", auth, isAdmin, async (req, res) => {
  const userRoleId = req.user.roleId; // Authenticated user's role ID
  const { id: unparsedTargetUserId } = req.params; // Target user ID
  //parse the targetUserId to an integer
  const targetUserId = parseInt(unparsedTargetUserId);
  const updatedData = req.body; // Data to update

  //normal users have been blocked by the isAdmin middleware

  try {
    // Fetch the target user
    const targetUser = await Users.findByPk(targetUserId);

    if (!targetUser) {
      return res.status(404).json({ message: "Target user not found" });
    }

    const targetUserIsAdmin = targetUser.role_id === ADMIN_ROLE_ID;
    const targetUserIsSuperAdmin = targetUser.role_id === SUPER_ADMIN_ROLE_ID;
    const disallowedFields = ["country_id", "city_id", "organization_id"];
    // Prevent Admins from modifying sensitive fields
    if (userRoleId !== SUPER_ADMIN_ROLE_ID) {
      
      const invalidFields = Object.keys(updatedData).filter(key => disallowedFields.includes(key));

      if (invalidFields.length > 0) {
        return res.status(400).json({
          message: `You are not allowed to update the following fields: ${invalidFields.join(", ")}`
        });
      }
    }

    if (userRoleId === SUPER_ADMIN_ROLE_ID && updatedData.role_id !== undefined) {
      const parsedRoleId = parseInt(updatedData.role_id);
      if (![USER_ROLE_ID, ADMIN_ROLE_ID, SUPER_ADMIN_ROLE_ID].includes(parsedRoleId)) {
        return res.status(400).json({ message: "Invalid role_id provided for user being updated" });
      }
      updatedData.role_id = parsedRoleId;
    }

    // First: Validate allowed update fields
    const allowedUpdates = [
      "first_name",
      "last_name",
      "email",
      ...(userRoleId === SUPER_ADMIN_ROLE_ID ? ["role_id", "country_id", "city_id", "organization_id"] : []),
    ].filter(Boolean);

    const filteredUpdates = Object.keys(updatedData)
      .filter((key) => allowedUpdates.includes(key))
      .reduce((obj, key) => {
        obj[key] = updatedData[key];
        return obj;
      }, {});

    if (userRoleId === SUPER_ADMIN_ROLE_ID && updatedData.role_id !== undefined) {
      filteredUpdates.role_id = updatedData.role_id;
    }

    // No valid fields provided, return 400 before any access control checks
    if (Object.keys(filteredUpdates).length === 0) {
      return res.status(400).json({ message: "No valid updates provided" });
    }

    // aditional role based access control. these are after the fetch of the target user because we need to know certain details about the target user to determine access. could/should we have done this before the fetch by getting the info some other way? 
    // if a user is admin, they cannot update a user outside of their organization
    if (userRoleId === ADMIN_ROLE_ID) {
      // if a user is admin, they cannot update any other admin or any super admin
      if (targetUserIsAdmin || targetUserIsSuperAdmin) {
        return res.status(403).json({
          message: "You do not have permission to update another admin",
        });
      }

      if (targetUser.organization_id !== req.user.organization_id || targetUser.country_id !== req.user.country_id) {
        return res.status(403).json({
          message: "Access denied. You can only update users within your assigned country and organization.",
        });
      }

      if (req.user.city_id && targetUser.city_id !== req.user.city_id) {
        return res.status(403).json({
          message: "Access denied. You can only update users within your assigned city.",
        });
      }
    }

    // Perform the update
    await targetUser.update(filteredUpdates);

    // Fetch the updated user with excluded sensitive fields
    const updatedUser = await Users.findByPk(targetUserId, {
      attributes: { exclude: ["password"] }, // Exclude sensitive fields
    });

    return res.status(200).json({
      message: "User updated successfully",
      user: updatedUser,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: err.message });
  }
});

router.delete('/delete-account', auth, async (req, res) => {
  try {
    console.log("User making delete request:", req.user); // Debugging

    if (!req.user || !req.user.id) {
      return res.status(400).json({ message: 'User not found' });
    }

    // Fetch the user from the database
    const user = await Users.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User does not exist." });
    }

    await user.destroy(); // Now `destroy()` will work

    return res.status(200).json({ message: "Your account has been deleted." });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: err.message });
  }
});

router.delete("/:id", auth, isAdmin, async (req, res) => {
  const userId = req.user.id; // Authenticated user's ID
  const userRoleId = req.user.roleId; // Authenticated user's role ID
  const userOrganizationId = req.user.organization_id; // Authenticated user's organization ID

  const { id: targetUserId } = req.params; // Target user ID to delete
  
  if(targetUserId === userId){
    return res.status(403).json({
      message: "You cannot delete your own user account",
    });
  }
  try {
    // Fetch the target user
    const targetUser = await Users.findByPk(targetUserId);
    const targetUserIsAdmin = targetUser.role_id === 2;
    const targetUserIsSuperAdmin = targetUser.role_id === 3;

    if (!targetUser) {
      return res.status(404).json({ message: "Target user not found" });
    }

    // Role-based deletion rules
    if(userRoleId === ADMIN_ROLE_ID){
      // Admins can only delete users within the same organization
      if(targetUser.organization_id !== userOrganizationId){
        return res.status(403).json({
          message: "You do not have permission to delete a user outside of your organization",
        });
      }
    }
    // admin cannot delete another admin or a super admin
    if(userRoleId === ADMIN_ROLE_ID && (targetUserIsAdmin || targetUserIsSuperAdmin)){
      return res.status(403).json({
        message: "You do not have permission to delete another admin",
      });
    }

    // Super admins can delete any user

    // Proceed with deletion
    await targetUser.destroy();

    res.status(200).json({
      message: `User with ID ${targetUserId} deleted successfully`,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
