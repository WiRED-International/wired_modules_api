const router = require("express").Router();
const { Users, Roles, QuizScores, Modules, Countries, Cities, Organizations, Specializations, AdminPermissions } = require('../../../models');
const auth = require("../../../middleware/auth");
const isAdmin = require("../../../middleware/isAdmin");
const { buildUserQueryFilters } = require("../../../middleware/accessControl");
const { Op, Sequelize } = require("sequelize");
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
    const user = req.user;
    let where = buildUserQueryFilters(req, { countryId, cityId, organizationId, roleId, sortBy, sortOrder, rowsPerPage, pageNumber });

    // 🧹 Clean up undefined filters before use
    Object.keys(where).forEach((key) => {
      if (where[key] === undefined) delete where[key];
    });

        // 🧩 Super Admin → Full access (no restriction)
    if (user.roleId === ROLES.SUPER_ADMIN) {
      // no change needed, full access
    }
    // 🧩 Admin → Only users from allowed organizations
    else if (user.roleId === ROLES.ADMIN) {
      // Find all organizations the admin can access
      console.log("👤 Logged-in user:", user);
      const adminPermissions = await AdminPermissions.findAll({
        where: { admin_id: user.id },
        attributes: ['organization_id']
      });
      console.log("📊 AdminPermissions found:", adminPermissions.map(p => p.organization_id));
      console.log("✅ AdminPermissions for admin", user.id, ":", adminPermissions.map(p => p.organization_id));
      const allowedOrgIds = adminPermissions.map(p => p.organization_id).filter(Boolean);

      if (allowedOrgIds.length === 0) {
        return res.status(403).json({ message: "No organization access assigned to this admin." });
      }

      // Limit users to those organizations
      // where = {
      //   ...where,
      //   organization_id: { [Op.in]: allowedOrgIds }
      // };
      if (allowedOrgIds.length > 0) {
        where.organization_id = { [Op.in]: allowedOrgIds };
      } else {
        console.warn(`⚠️ Admin ${user.id} has no assigned organizations — returning no users.`);
        where.organization_id = { [Op.in]: [] };
      }
    } 
    // 🧩 Regular user → Only themselves
    else {
      where = { id: user.id };
    }

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

// ─────────────────────────────────────────────────────────────
// GET /search/broad
// Paginated, sortable, searchable user listing (with count cache)
// ─────────────────────────────────────────────────────────────
const countCache = new Map(); // Simple in-memory cache
const CACHE_TTL_MS = 10_000; // 10 seconds per unique query key

router.get("/search/broad", auth, isAdmin, async (req, res) => {
  const {
    query,
    rowsPerPage = 10,
    pageNumber = 1,
    sortBy,
    sortOrder,
    roleId,
  } = req.query;

  try {
    const user = req.user;
    const AND = [];

    // ── Role-based visibility ───────────────────────────────
    if (user.roleId === ROLES.ADMIN) {
      const adminPermissions = await AdminPermissions.findAll({
        where: { admin_id: user.id },
        attributes: ["organization_id"],
      });

      const allowedOrgIds = adminPermissions.map((p) => p.organization_id).filter(Boolean);
      if (allowedOrgIds.length === 0)
        return res.status(403).json({ message: "No organization access assigned to this admin." });

      AND.push({ organization_id: { [Op.in]: allowedOrgIds } });
      AND.push({ [Op.or]: [{ role_id: ROLES.USER }, { id: user.id }] });
    } else if (user.roleId !== ROLES.SUPER_ADMIN) {
      AND.push({ id: user.id });
    }

    // ── Free-text search ───────────────────────────────
    const buildBroadSearch = (term) => {
      if (!term || !term.trim()) return {};
      const q = term.trim();
      return {
        [Op.or]: [
          { first_name: { [Op.like]: `%${q}%` } },
          { last_name:  { [Op.like]: `%${q}%` } },
          { email:      { [Op.like]: `%${q}%` } },
          { "$organization.name$": { [Op.like]: `%${q}%` } },
          { "$role.name$":         { [Op.like]: `%${q}%` } },
          { "$country.name$":      { [Op.like]: `%${q}%` } },
          { "$city.name$":         { [Op.like]: `%${q}%` } },
        ],
      };
    };

    const where = {
      [Op.and]: [
        ...AND,
        buildBroadSearch(query),
        roleId ? { role_id: parseInt(roleId, 10) } : {},
      ],
    };

    const limit = parseInt(rowsPerPage, 10);
    const page = parseInt(pageNumber, 10);
    const offset = (page - 1) * limit;

    // ── Common includes ───────────────────────────────
    const includeBase = [
      { model: Organizations, as: "organization", attributes: ["id", "name"], required: false },
      { model: Roles,         as: "role",         attributes: ["id", "name"], required: false },
      { model: Countries,     as: "country",      attributes: ["id", "name"], required: false },
      { model: Cities,        as: "city",         attributes: ["id", "name"], required: false },
    ];

    // ── Sorting ───────────────────────────────
    const order = [];
    const direction = sortOrder?.toUpperCase() === "DESC" ? "DESC" : "ASC";

    switch (sortBy) {
      case "organization":
      case "organization.name":
        order.push([{ model: Organizations, as: "organization" }, "name", direction]);
        break;
      case "role":
      case "role.name":
        order.push([{ model: Roles, as: "role" }, "name", direction]);
        break;
      case "country":
      case "country.name":
        order.push([{ model: Countries, as: "country" }, "name", direction]);
        break;
      case "city":
      case "city.name":
        order.push([{ model: Cities, as: "city" }, "name", direction]);
        break;
      case "email":
      case "first_name":
      case "last_name":
        order.push([sortBy, direction]);
        break;
      default:
        order.push(["last_name", "ASC"]);
    }

    const extraOrderCol =
      sortBy && ["email", "first_name", "last_name"].includes(sortBy)
        ? [sortBy]
        : [];

    // ── Step 1: Fetch distinct user IDs ───────────────────────────────
    const userIdRows = await Users.findAll({
      where,
      include: includeBase,
      attributes: [
        [Sequelize.fn("DISTINCT", Sequelize.col("Users.id")), "id"],
        ...extraOrderCol.map((col) => Sequelize.col(`Users.${col}`)),
      ],
      order,
      limit,
      offset,
      raw: true,
      subQuery: false,
    });

    const userIds = userIdRows.map((r) => r.id);
    if (userIds.length === 0)
      return res.status(200).json({ users: [], totalUsers: 0, page, rowsPerPage: limit, pageCount: 0 });

    // ── Step 2: Fetch full user data ───────────────────────────────
    const users = await Users.findAll({
      where: { id: { [Op.in]: userIds } },
      include: [
        ...includeBase,
        {
          model: QuizScores,
          as: "quizScores",
          attributes: ["score", "date_taken"],
          include: [
            { model: Modules, as: "module", attributes: ["id", "name", "module_id", "categories"] },
          ],
          required: false,
        },
        { model: Specializations, as: "specializations", attributes: ["name"], required: false },
      ],
      order,
      subQuery: false,
      attributes: ["id", "first_name", "last_name", "email"],
    });

    // ── Step 3: Cached total count ───────────────────────────────
    const cacheKey = JSON.stringify({ query, roleId, userRole: user.roleId });
    const cached = countCache.get(cacheKey);
    let totalUsers;

    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      totalUsers = cached.value;
    } else {
      totalUsers = await Users.count({
        where,
        distinct: true,
        col: "id",
        include: includeBase,
      });
      countCache.set(cacheKey, { value: totalUsers, timestamp: Date.now() });
    }

    const pageCount = Math.ceil(totalUsers / limit);

    // ── Compute completion % ───────────────────────────────
    const TOTAL_BASIC_MODULES = 28;
    for (const user of users) {
      const quizScores = user.quizScores || [];
      const completedBasics = quizScores.filter(
        (qs) =>
          qs.score >= 80 &&
          Array.isArray(qs.module?.categories) &&
          qs.module.categories.includes("basic")
      ).length;
      const percent = TOTAL_BASIC_MODULES > 0 ? (completedBasics / TOTAL_BASIC_MODULES) * 100 : 0;
      user.setDataValue("basicCompletionPercent", parseFloat(percent.toFixed(2)));
    }

    // ── Response ───────────────────────────────
    return res.status(200).json({
      users,
      totalUsers,
      page,
      rowsPerPage: limit,
      pageCount,
      cacheHit: !!cached,
    });

  } catch (err) {
    console.error("❌ Error in /search/broad:", err);
    return res.status(500).json({ message: "Internal server error" });
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
        "organization_id",
        "country_id",
        "city_id",
        "role_id"
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
              attributes: ['name', 'module_id', 'categories', 'credit_type',],
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

    // SUPER ADMIN → full access
    if (requester.roleId === ROLES.SUPER_ADMIN) {
      return res.status(200).json(user);
    }

    // 🧩 ADMIN → limited access
    if (requester.roleId === ROLES.ADMIN) {
      // Allow admins to always view their own profile
      if (requester.id === targetUserId) {
        return res.status(200).json(user);
      }
      // Get all orgs this admin has permission for
      const adminPermissions = await AdminPermissions.findAll({
        where: { admin_id: requester.id },
        attributes: ["organization_id"],
      });
      const allowedOrgIds = adminPermissions.map(p => p.organization_id);

      // Restrict to allowed orgs only
      if (!allowedOrgIds.includes(user.organization_id)) {
        return res.status(403).json({
          message: "Access denied. You can only view users within your assigned organizations.",
        });
      }

      // Optional city restriction
      // if (requester.city_id && user.city_id !== requester.city_id) {
      //   return res.status(403).json({ message: "Access denied. You can only view users within your assigned city." });
      // }

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
      message: `User ${targetUser.first_name} ${targetUser.last_name} has been deleted successfully`,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
