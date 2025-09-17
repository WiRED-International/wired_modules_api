const router = require("express").Router();
const { Users, Roles, QuizScores, Modules, Countries, Cities, Organizations, Specializations } = require('../../../models');
const auth = require("../../../middleware/auth");
const isAdmin = require("../../../middleware/isAdmin");
const { buildUserQueryFilters } = require("../../../middleware/accessControl");
const { Op } = require("sequelize");
const ROLES = require("../../../utils/roles")

const sortAscend = 'ASC';
const sortDescend = 'DESC';

//this route is actually no longer beings used by the admin dashboard, but I am leaving it here in case it is being used elsewhere
router.get("/", auth, isAdmin, async (req, res) => {
  const { countryId, cityId, organizationId, roleId, sortBy, sortOrder = sortAscend, rowsPerPage = 10, pageNumber = 1 } = req.query;
  const allowedSortFields = [
    "actions",
    "first_name",
    "last_name",
    "email",
    "CME_Credits",
    "remainingCredits",
    "specializations",
    "role",
    "country",
    "city",
    "organization"
  ]
  
  try {
    const where = buildUserQueryFilters(req, { countryId, cityId, organizationId, roleId, sortBy, sortOrder, rowsPerPage, pageNumber });

    const order = [];
    if (sortBy) {

      const safeSortBy = allowedSortFields.includes(sortBy)
        ? sortBy
        : 'last_name'; // Default to last_name if sortBy is not allowed

      const safeSortOrder = sortOrder?.toUpperCase() === sortAscend ? sortAscend : sortDescend;
      switch (safeSortBy) {
        case 'organization':
          order.push([{ model: Organizations, as: 'organization' }, 'name', safeSortOrder]);
          break;

        case 'role':
          order.push([{ model: Roles, as: 'role' }, 'name', safeSortOrder]);
          break;

        case 'country':
          order.push([{ model: Countries, as: 'country' }, 'name', safeSortOrder]);
          break;

        case 'city':
          order.push([{ model: Cities, as: 'city' }, 'name', safeSortOrder]);
          break;

        case 'specializations':
          // Always ASC for alphabetic sorting of first specialization
          order.push([{ model: Specializations, as: 'specializations' }, 'name', sortAscend]);
          break;

        default:
          // Sorting by field on Users table
          order.push([safeSortBy, safeSortOrder]);
      }
    }

    const limit = parseInt(rowsPerPage, 10) || 10;
    const offset = ((parseInt(pageNumber, 10) || 1) - 1) * limit;



    const users = await Users.findAll({
      where,
      attributes: ["id", "first_name", "last_name", "email",],
      include: [
        {
          model: Organizations,
          as: "organization",
          attributes: ["name", "id"],
        },
        {
          model: Roles,
          as: "role",
          attributes: ["name", "id"],
        },
        {
          model: Countries,
          as: "country",
          attributes: ["name", "id"],
        },
        {
          model: Cities,
          as: "city",
          attributes: ["name", "id"],
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
          attributes: ['name', 'id'],
        }
      ],
      order: order.length > 0 ? order : [['last_name', sortAscend]], // Default sort by last_name if no sortBy provided
      limit,
      offset,
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
          model: Roles,
          as: 'role',
          attributes: ['name'],
        },
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
          attributes: ['name', 'id'],
        },
        {
          model: Organizations,
          as: 'organization',
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
        {
          model: Organizations,
          as: "organization",
          attributes: ["name", "id"],
        },
        {
          model: Roles,
          as: "role",
          attributes: ["name", "id"],
        },
        {
          model: Countries,
          as: "country",
          attributes: ["name", "id"],
        },
        {
          model: Cities,
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

//search users by first name, last name, or email with one broad search query
router.get("/search/broad", auth, isAdmin, async (req, res) => {
  const { query, rowsPerPage = 10, pageNumber = 1, sortBy, sortOrder, organizationId, countryId, cityId, roleId } = req.query; // The search query

  try {
    const where = buildUserQueryFilters(req);

    if (query) {
      where[Op.or] = [
        { first_name: { [Op.like]: `%${query}%` } },
        { last_name: { [Op.like]: `%${query}%` } },
        { email: { [Op.like]: `%${query}%` } }
      ];
    }

    if (countryId && !isNaN(parseInt(countryId))) {
      where.country_id = parseInt(countryId);
    }
    if (cityId && !isNaN(parseInt(cityId))) {
      where.city_id = parseInt(cityId);
    }

    if (organizationId && !isNaN(parseInt(organizationId))) {
      where.organization_id = parseInt(organizationId);
    }

    if (roleId && !isNaN(parseInt(roleId))) {
      where.role_id = parseInt(roleId);
    }

    const limit = parseInt(rowsPerPage, 10) || 10;
    const page = parseInt(pageNumber, 10) || 1;
    const offset = (page - 1) * limit;

    //due to the complexity of sorting by associated models, we will do the sorting in JavaScript after fetching the data
    // this is not ideal for large datasets, but it is acceptable for small to moderate datasets. if the dataset grows too large, we may need to implement a more complex solution using raw SQL queries or a different ORM that supports more advanced sorting capabilities.
    // another option would be to create separate endpoints for each type of sorting that requires associated models, but that would lead to a proliferation of endpoints and is not a great solution either.

    // const order = [];
    // if (sortBy) {
    //   const allowedSortFields = [
    //     "first_name",
    //     "last_name",
    //     "email",
    //     "CME_Credits",
    //     "remainingCredits",
    //     "specializations",
    //     "role",
    //     "country",
    //     "city",
    //     "organization"
    //   ];
    //   const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'last_name'; // Default to last_name if sortBy is not allowed
    //   const safeSortOrder = sortOrder?.toUpperCase() === sortAscend ? sortAscend : sortDescend;
    //   switch (safeSortBy) {
    //     case 'organization':
    //       order.push([{ model: Organizations, as: 'organization' }, 'name', safeSortOrder]);
    //       break;      
    //     case 'role':
    //       order.push([{ model: Roles, as: 'role' }, 'name', safeSortOrder]);
    //       break;
    //     case 'country':
    //       order.push([{ model: Countries, as: 'country' }, 'name', safeSortOrder]);
    //       break;
    //     case 'city':
    //       order.push([{ model: Cities, as: 'city' }, 'name', safeSortOrder]);
    //       break;
    //     case 'specializations':
    //       // Always ASC for alphabetic sorting of first specialization
    //       order.push([{ model: Specializations, as: 'specializations' }, 'name', sortAscend]);
    //       break;
    //     default:
    //       // Sorting by field on Users table
    //       order.push([safeSortBy, safeSortOrder]);
    //   }
    // } else {
    //   order.push(['last_name', sortAscend]); // Default sort by last_name if no sortBy provided
    // }
    

    // Count total users matching filters
    const totalUsers = await Users.count({ where });
    const pageCount = Math.ceil(totalUsers / limit);

    const users = await Users.findAll({
      where,
      attributes: ["id", "first_name", "last_name", "email"],
      include: [
        {
          model: Organizations,
          as: "organization",
          attributes: ["name", "id"],
          required: false,
        },
        {
          model: Roles,
          as: "role",
          attributes: ["name", "id"],
        },
        {
          model: Countries,
          as: "country",
          attributes: ["name", "id"],
          required: false,
        },
        {
          model: Cities,
          as: "city",
          attributes: ["name"],
          required: false,
        },
        {
          model: QuizScores,
          as: "quizScores",
          attributes: ["score", "date_taken"],
          include: [
            {
              model: Modules,
              as: "module",
              attributes: ["name", "module_id"],
            },
          ],
          required: false,
        },
        {
          model: Specializations,
          as: 'specializations',
          attributes: ['name'],
          required: false, // Allow users without specializations to still be returned
          group: ['users.id'],
        }
      ],

      //sorting and pagination will be handled in JavaScript after fetching the data

      // order,
      // limit,
      // offset,
      // distinct: true,
      // subQuery: false,
    });
    if(sortBy === 'last_name' || !sortBy) {
      users.sort((a, b) => {
        const nameA = a.last_name.toUpperCase(); // ignore upper and lowercase
        const nameB = b.last_name.toUpperCase(); // ignore upper and lowercase
        if (nameA < nameB) return sortOrder === sortAscend ? -1 : 1;
        if (nameA > nameB) return sortOrder === sortAscend ? 1 : -1;
        return 0;
      });
    } else if (sortBy === 'first_name') {
      users.sort((a, b) => {
        const nameA = a.first_name.toUpperCase(); // ignore upper and lowercase
        const nameB = b.first_name.toUpperCase(); // ignore upper and lowercase
        if (nameA < nameB) return sortOrder === sortAscend ? -1 : 1;
        if (nameA > nameB) return sortOrder === sortAscend ? 1 : -1;
        return 0;
      });
    } else if (sortBy === 'email') {
      users.sort((a, b) => {
        const nameA = a.email.toUpperCase(); // ignore upper and lowercase
        const nameB = b.email.toUpperCase(); // ignore upper and lowercase
        if (nameA < nameB) return sortOrder === sortAscend ? -1 : 1;
        if (nameA > nameB) return sortOrder === sortAscend ? 1 : -1;
        return 0;
      });
    } else if (sortBy === 'organization') {
      users.sort((a, b) => {
        const orgA = a.organization ? a.organization.name : '';
        const orgB = b.organization ? b.organization.name : '';
        if (orgA < orgB) return sortOrder === sortAscend ? -1 : 1;
        if (orgA > orgB) return sortOrder === sortAscend ? 1 : -1;
        return 0;
      });
    } else if (sortBy === 'role') {
      users.sort((a, b) => {
        const roleA = a.role ? a.role.name : '';
        const roleB = b.role ? b.role.name : '';
        if (roleA < roleB) return sortOrder === sortAscend ? -1 : 1;
        if (roleA > roleB) return sortOrder === sortAscend ? 1 : -1;
        return 0;
      });
    }

    //pagination
    const start = offset;
    const end = offset + limit;
    const paginatedUsers = users.slice(start, end);

    return res.status(200).json({ users: paginatedUsers, totalUsers, page, rowsPerPage: limit, pageCount });
  } catch (err) {
    console.error(err);
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
        {
          model: Organizations,
          as: "organization",
          attributes: ["name"],
        },
        {
          model: Roles,
          as: "role",
          attributes: ["name", "id"],
        },
        {
          model: Countries,
          as: "country",
          attributes: ["name", "id"],
        },
        {
          model: Cities,
          as: "city",
          attributes: ["name", "id"],
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
          attributes: ['name', 'id'],
        }
      ],
    });

    // Check if user exists
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const requester = req.user;

    if (requester.roleId === ROLES.ADMIN) {
      if (user.organization_id !== requester.organization_id || user.country_id !== requester.country_id) {
        return res.status(403).json({ message: "Access denied. You can only view users within your assigned organization and country." });
      }

      // Optional city restriction
      if (requester.city_id && user.city_id !== requester.city_id) {
        return res.status(403).json({ message: "Access denied. You can only view users within your assigned city." });
      }

      // Role restriction
      if (user.role_id !== ROLES.USER) {
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

    const targetUserIsAdmin = targetUser.role_id === ROLES.ADMIN;
    const targetUserIsSuperAdmin = targetUser.role_id === ROLES.SUPER_ADMIN;
    const disallowedFields = ["country_id", "city_id", "organization_id"];
    // Prevent Admins from modifying sensitive fields
    if (userRoleId !== ROLES.SUPER_ADMIN) {

      const invalidFields = Object.keys(updatedData).filter(key => disallowedFields.includes(key));

      if (invalidFields.length > 0) {
        return res.status(400).json({
          message: `You are not allowed to update the following fields: ${invalidFields.join(", ")}`
        });
      }
    }

    if (userRoleId === ROLES.SUPER_ADMIN && updatedData.role_id !== undefined) {
      const parsedRoleId = parseInt(updatedData.role_id);
      if (![ROLES.USER, ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(parsedRoleId)) {
        return res.status(400).json({ message: "Invalid role_id provided for user being updated" });
      }
      updatedData.role_id = parsedRoleId;
    }

    //update specializations if provided
    // this is done separately because specializations is a many-to-many relationship and cannot be updated like a normal field
    if (userRoleId === ROLES.SUPER_ADMIN && updatedData.specialization_ids !== undefined) {
      if (!Array.isArray(updatedData.specialization_ids)) {
        return res.status(400).json({ message: "Specializations must be an array of specialization IDs" });
      }
      // set the specializations
      await targetUser.setSpecializations(updatedData.specialization_ids);
      // remove specializations from updatedData to prevent trying to update a non-existent field
      delete updatedData.specialization_ids;
    }

    // First: Validate allowed update fields
    const allowedUpdates = [
      "first_name",
      "last_name",
      "email",
      ...(userRoleId === ROLES.SUPER_ADMIN ? ["role_id", "country_id", "city_id", "organization_id"] : []),
    ].filter(Boolean);

    const filteredUpdates = Object.keys(updatedData)
      .filter((key) => allowedUpdates.includes(key))
      .reduce((obj, key) => {
        obj[key] = updatedData[key];
        return obj;
      }, {});

    if (userRoleId === ROLES.SUPER_ADMIN && updatedData.role_id !== undefined) {
      filteredUpdates.role_id = updatedData.role_id;
    }

    // No valid fields provided, return 400 before any access control checks
    if (Object.keys(filteredUpdates).length === 0) {
      return res.status(400).json({ message: "No valid updates provided" });
    }

    // aditional role based access control. these are after the fetch of the target user because we need to know certain details about the target user to determine access. could/should we have done this before the fetch by getting the info some other way? 
    // if a user is admin, they cannot update a user outside of their organization
    if (userRoleId === ROLES.ADMIN) {
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
      include: [
        {
          model: Organizations,
          as: "organization",
          attributes: ["name"],
        },
        {
          model: Roles,
          as: "role",
          attributes: ["name", "id"],
        },
        {
          model: Countries,
          as: "country",
          attributes: ["name", "id"],
        },
        {
          model: Cities,
          as: "city",
          attributes: ["name", "id"],
        },
        {
          model: Specializations,
          as: 'specializations',
          attributes: ['name', 'id'],
        }
      ],
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

  if (targetUserId === userId) {
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
    if (userRoleId === ROLES.ADMIN) {
      // Admins can only delete users within the same organization
      if (targetUser.organization_id !== userOrganizationId) {
        return res.status(403).json({
          message: "You do not have permission to delete a user outside of your organization",
        });
      }
    }
    // admin cannot delete another admin or a super admin
    if (userRoleId === ROLES.ADMIN && (targetUserIsAdmin || targetUserIsSuperAdmin)) {
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
