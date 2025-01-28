const router = require("express").Router();
const { Users, Roles, QuizScores, Modules } = require('../../../models');
const auth = require("../../../middleware/auth");
const isAdmin = require("../../../middleware/isAdmin");
const { Op } = require("sequelize");

const validRoles = [1, 2, 3];
const ADMIN_ROLE_ID = 2;
const SUPER_ADMIN_ROLE_ID = 3;

router.get("/", auth, isAdmin, async (req, res) => {
  const { countryId, cityId, organizationId, roleId } = req.query;
  const userRoleId = req.user.roleId;

  try {
    // Initialize the base `where` clause
    let where = {};

    // Restrict data visibility based on user role
    if (userRoleId === ADMIN_ROLE_ID) {
      // Admin: Can only view users within the same organization
      where.organization_id = req.user.organization_id;

      // Optionally filter within the allowed scope
      where = {
        ...where,
        ...(countryId && { country_id: countryId }),
        ...(cityId && { city_id: cityId }),
        ...(roleId && { role_id: roleId }),
      };
    } else if (userRoleId === SUPER_ADMIN_ROLE_ID) {
      // Super-Admin Can view any user
      where = {
        ...(countryId && { country_id: countryId }),
        ...(cityId && { city_id: cityId }),
        ...(organizationId && { organization_id: organizationId }),
        ...(roleId && { role_id: roleId }),
      };
    } else {
      // Role not recognized, deny access (should not happen due to `isAdmin`)
      return res
        .status(403)
        .json({ message: "You do not have permission to view users" });
    }

    // Fetch the users with filters
    const users = await Users.findAll({
      where,
      attributes: ["id", "first_name", "last_name", "email", "organization_id"],
      include: [
        {
          model: Roles,
          as: "role",
          attributes: ["name"],
        },
      ],
    });

    res.status(200).json(users);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: err.message });
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
      ],
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json(user);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: err.message });
  }
});

router.get("/search", auth, isAdmin, async (req, res) => {
  //users can be searched by one or more of the following fields. searches are case-insensitive
  const { email, first_name, last_name } = req.query;
  const userRoleId = req.user.roleId;

  try {
    // Initialize the base `where` clause
    let whereClause = {};
    // Restrict data visibility based on user role

    if (userRoleId === ADMIN_ROLE_ID) {
      // Admin: Can only view users within the same organization
      whereClause.organization_id = req.user.organization_id;
      //if user is neither admin nor super admin, deny access
    } else if (userRoleId !== SUPER_ADMIN_ROLE_ID) {
      return res
        .status(403)
        .json({ message: "You do not have permission to search for users" });
    }

    // Add case-insensitive search filters if provided
    if (email) {
      whereClause.email = { [Op.like]: '%' + email + '%' }
    }

    if (first_name) {
      whereClause.first_name = { [Op.like]: '%' + first_name + '%' }
    }

    if (last_name) {
      whereClause.last_name = { [Op.like]: '%' + last_name + '%' }
    }

    // Fetch the users with filters
    const users = await Users.findAll({
      where: whereClause, // Use the correct `where` object
      attributes: ["id", "first_name", "last_name", "email", "organization_id"],
      include: [
        {
          model: Roles,
          as: "role",
          attributes: ["name"],
        },
      ],
    });

    res.status(200).json(users);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: err.message });
  }
});

router.get("/:id", auth, isAdmin, async (req, res) => {
  const targetUserId = req.params.id;
  const userRoleId = req.user.roleId;

  try {
    // Find the user by ID
    const user = await Users.findOne({
      where: { id: targetUserId },
      attributes: [
        "id",
        "first_name",
        "last_name",
        "email",
        "organization_id",
        "role_id",
      ],
      include: [{ model: Roles, as: "role", attributes: ["name"] }],
    });

    //

    // Check if user exists
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Role-based access control (non-admins basically cant query any user)
    if (userRoleId === ADMIN_ROLE_ID) {
      // admins can only view users within the same organization
      if (user.organization_id !== req.user.organization_id) {
        return res
          .status(403)
          .json({
            message:
              "Access denied, you can only access users from within your organization",
          });
      }
    } else if (userRoleId !== SUPER_ADMIN_ROLE_ID) {
      // super admins can view any user; other roles cannot
      return res
        .status(403)
        .json({ message: "Access denied, contact your system administrator" });
    }

    // Return the user details
    res.status(200).json(user);
  } catch (err) {
    console.log(err);
    res
      .status(500)
      .json({ message: "An error occurred while fetching the user" });
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
    //if the user is attempting to update the role_id
    if (updatedData.role_id !== undefined) {
      //if the user is not a super admin, they cannot update the role_id
      if (userRoleId !== SUPER_ADMIN_ROLE_ID) {
        return res
          .status(403)
          .json({ message: "You do not have permission to update a user's role_id" });
      }
      //check if the role_id for the target user is valid
      if (!validRoles.includes(updatedData.role_id)) {
        return res
          .status(400)
          .json({ message: "Invalid role_id provided for user being updated" });
      }
    }

 

    // Fetch the target user
    const targetUser = await Users.findByPk(targetUserId);

    if (!targetUser) {
      return res.status(404).json({ message: "Target user not found" });
    }
    const targetUserIsAdmin = targetUser.role_id === ADMIN_ROLE_ID;
    const targetUserIsSuperAdmin = targetUser.role_id === SUPER_ADMIN_ROLE_ID;

    // aditional role based access control. these are after the fetch of the target user because we need to know certain details about the target user to determine access. could/should we have done this before the fetch by getting the info some other way? 

    // if a user is admin, they cannot update a user outside of their organization
    if (userRoleId === ADMIN_ROLE_ID && targetUser.organization_id !== req.user.organization_id) {
      return res.status(403).json({
        message:
          "You do not have permission to update a user outside of your organization",
      });
    }
    // if a user is admin, they cannot update any other admin or any super admin
    if (userRoleId === ADMIN_ROLE_ID && (targetUserIsAdmin || targetUserIsSuperAdmin)) {
      return res.status(403).json({
        message: "You do not have permission to update another admin",
      });
    }

    // Ensure only allowed fields are updated
    const allowedUpdates = [
      "first_name",
      "last_name",
      "email",
      "password",
      userRoleId === SUPER_ADMIN_ROLE_ID ? "role_id" : null,
      "country_id",
      "city_id",
      "organization_id",
    ];
    const filteredUpdates = Object.keys(updatedData)
      .filter((key) => allowedUpdates.includes(key))
      .reduce((obj, key) => {
        obj[key] = updatedData[key];
        return obj;
      }, {});
    //if no valid updates are provided
    if (Object.keys(filteredUpdates).length === 0) {
      return res.status(400).json({ message: "No valid updates provided" });
    }
    // Perform the update
    await targetUser.update(filteredUpdates);

    // Fetch the updated user with excluded sensitive fields
    const updatedUser = await Users.findByPk(targetUserId, {
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
