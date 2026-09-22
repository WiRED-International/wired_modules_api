const router = require("express").Router();
const {
  Organizations,
  OrganizationCountries,
  AdminPermissions,
  Users,
  Countries,
  Classes,
} = require("../../../models");
const auth = require("../../../middleware/auth");
const isSuperAdmin = require("../../../middleware/isSuperAdmin");
const {
  Sequelize,
  Op,
} = require("sequelize");

// =====================================================
// GET All ORGANIZATIONS - SUPER ADMIN
// =====================================================

router.get("/", auth, isSuperAdmin, async (req, res) => {
  const {
    page,
    limit,
    query,
    sortBy = "name",
    sortDirection = "asc",
  } = req.query;

  const allowedSortFields = [
    "name",
    "userCount",
  ];

  const normalizedSortBy =
    allowedSortFields.includes(sortBy)
      ? sortBy
      : "name";

  const normalizedSortDirection =
    String(sortDirection).toLowerCase() === "desc"
      ? "DESC"
      : "ASC";

  const pageNumber =
    page !== undefined ? Number(page) : null;

  const pageLimit =
    limit !== undefined ? Number(limit) : null;

  try {
    const where = {};

    if (query) {
      where.name = {
        [Op.like]: `%${query}%`,
      };
    }

    const usePagination =
      Number.isSafeInteger(pageNumber) &&
      pageNumber > 0 &&
      Number.isSafeInteger(pageLimit) &&
      pageLimit > 0;

    const offset = usePagination
      ? (pageNumber - 1) * pageLimit
      : undefined;

    const total = usePagination
      ? await Organizations.count({
          where,
        })
      : null;

    const organizationRows =
      await Organizations.findAll({
        where,
        attributes: [
          "id",
          "name",
          [
            Sequelize.fn(
              "COUNT",
              Sequelize.col("users.id")
            ),
            "userCount",
          ],
        ],
        include: [
          {
            model: Users,
            as: "users",
            attributes: [],
            required: false,
          },
        ],
        group: [
          "Organizations.id",
          "Organizations.name",
        ],
        order:
          normalizedSortBy === "userCount"
            ? [
                [
                  Sequelize.literal("userCount"),
                  normalizedSortDirection,
                ],
              ]
            : [
                [
                  "name",
                  normalizedSortDirection,
                ],
              ],
        limit: usePagination
          ? pageLimit
          : undefined,
        offset,
        subQuery: false,
      });

    const organizationIds =
      organizationRows.map(
        (organization) => organization.id
      );

    const countryRows =
      organizationIds.length > 0
        ? await Organizations.findAll({
            where: {
              id: organizationIds,
            },
            attributes: [
              "id",
            ],
            include: [
              {
                model: Countries,
                as: "countries",
                attributes: [
                  "id",
                  "name",
                ],
                through: {
                  attributes: [],
                },
                required: false,
              },
            ],
          })
        : [];

    const countriesByOrganizationId =
      new Map(
        countryRows.map((organization) => [
          organization.id,
          organization.countries,
        ])
      );

    const organizations =
      organizationRows.map((organization) => {
        const plainOrganization =
          organization.get({
            plain: true,
          });

        return {
          ...plainOrganization,
          countries:
            countriesByOrganizationId.get(
              organization.id
            ) ?? [],
        };
      });

    if (usePagination) {
      return res.status(200).json({
        organizations,
        pagination: {
          page: pageNumber,
          limit: pageLimit,
          total,
          totalPages: Math.ceil(
            total / pageLimit
          ),
        },
      });
    }

    return res.status(200).json({
      organizations,
    });
  } catch (err) {
    console.error(
      "Organization List Error:",
      err
    );

    return res.status(500).json({
      message: "Failed to load organizations.",
      error: err.message,
    });
  }
});

// =====================================================
// CREATE ORGANIZATION - SUPER ADMIN
// =====================================================

router.post("/", auth, isSuperAdmin, async (req, res) => {
  try {
    const { name, country_ids = [] } = req.body;

    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        message: "Organization name is required.",
      });
    }

    if (!Array.isArray(country_ids)) {
      return res.status(400).json({
        message: "country_ids must be an array.",
      });
    }

    const normalizedCountryIds = country_ids.map((id) => Number(id));

    const hasInvalidCountryId = normalizedCountryIds.some(
      (id) => !Number.isSafeInteger(id) || id <= 0
    );

    if (hasInvalidCountryId) {
      return res.status(400).json({
        message: "All country_ids must be valid country IDs.",
      });
    }

    const organization = await Organizations.create({
      name: name.trim(),
      country_id: null,
      city_id: null,
    });

    if (normalizedCountryIds.length > 0) {
      await organization.setCountries(normalizedCountryIds);
    }

    const createdOrganization = await Organizations.findByPk(
      organization.id,
      {
        include: [
          {
            model: Countries,
            as: "countries",
            attributes: ["id", "name"],
            through: { attributes: [] },
          },
        ],
      }
    );

    return res.status(201).json({
      message: "Organization created successfully.",
      organization: createdOrganization,
    });

  } catch (err) {
    console.error("Create Organization Error:", err);

    if (err.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({
        message: "This organization already exists.",
      });
    }

    if (err.name === "SequelizeForeignKeyConstraintError") {
      return res.status(400).json({
        message: "One or more selected countries do not exist.",
      });
    }

    return res.status(500).json({
      message: "Failed to create organization.",
      error: err.message,
    });
  }
});

// =====================================================
// UPDATE ORGANIZATION - SUPER ADMIN
// =====================================================

router.put("/:organizationId", auth, isSuperAdmin, async (req, res) => {
  try {
    const organizationId = Number(req.params.organizationId);
    const { name, country_ids = [] } = req.body;

    if (
      !Number.isSafeInteger(organizationId) ||
      organizationId <= 0
    ) {
      return res.status(400).json({
        message: "Valid organizationId is required.",
      });
    }

    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        message: "Organization name is required.",
      });
    }

    if (!Array.isArray(country_ids)) {
      return res.status(400).json({
        message: "country_ids must be an array.",
      });
    }

    const normalizedCountryIds = country_ids.map((id) =>
      Number(id)
    );

    const hasInvalidCountryId = normalizedCountryIds.some(
      (id) => !Number.isSafeInteger(id) || id <= 0
    );

    if (hasInvalidCountryId) {
      return res.status(400).json({
        message: "All country_ids must be valid country IDs.",
      });
    }

    const organization = await Organizations.findByPk(
      organizationId
    );

    if (!organization) {
      return res.status(404).json({
        message: "Organization not found.",
      });
    }

    await organization.update({
      name: name.trim(),
      country_id: null,
      city_id: null,
    });

    await organization.setCountries(normalizedCountryIds);

    const updatedOrganization = await Organizations.findByPk(
      organization.id,
      {
        include: [
          {
            model: Countries,
            as: "countries",
            attributes: ["id", "name"],
            through: { attributes: [] },
          },
        ],
      }
    );

    return res.status(200).json({
      message: "Organization updated successfully.",
      organization: updatedOrganization,
    });

  } catch (err) {
    console.error("Update Organization Error:", err);

    if (err.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({
        message: "This organization already exists.",
      });
    }

    if (err.name === "SequelizeForeignKeyConstraintError") {
      return res.status(400).json({
        message: "One or more selected countries do not exist.",
      });
    }

    return res.status(500).json({
      message: "Failed to update organization.",
      error: err.message,
    });
  }
});

// =====================================================
// DELETE UNUSED ORGANIZATION - SUPER ADMIN
// =====================================================

router.delete(
  "/:organizationId",
  auth,
  isSuperAdmin,
  async (req, res) => {
    const organizationId = Number(
      req.params.organizationId
    );

    try {
      if (
        !Number.isSafeInteger(organizationId) ||
        organizationId <= 0
      ) {
        return res.status(400).json({
          message:
            "Valid organizationId is required.",
        });
      }

      const organization =
        await Organizations.findByPk(
          organizationId
        );

      if (!organization) {
        return res.status(404).json({
          message: "Organization not found.",
        });
      }

      // -----------------------------------------------
      // Block if users belong to this organization
      // -----------------------------------------------

      const userCount = await Users.count({
        where: {
          organization_id: organizationId,
        },
      });

      if (userCount > 0) {
        return res.status(400).json({
          message:
            "This organization cannot be deleted because it has one or more users.",
        });
      }

      // -----------------------------------------------
      // Block if classes belong to this organization
      // -----------------------------------------------

      const classCount = await Classes.count({
        where: {
          organization_id: organizationId,
        },
      });

      if (classCount > 0) {
        return res.status(400).json({
          message:
            "This organization cannot be deleted because it has one or more classes.",
        });
      }

      // -----------------------------------------------
      // Block if an Admin is assigned
      // -----------------------------------------------

      const adminPermissionCount =
        await AdminPermissions.count({
          where: {
            organization_id: organizationId,
          },
        });

      if (adminPermissionCount > 0) {
        return res.status(400).json({
          message:
            "This organization cannot be deleted because it has one or more assigned admins.",
        });
      }

      // -----------------------------------------------
      // Block if associated with any exams
      // -----------------------------------------------

      const [examAssociations] =
        await Organizations.sequelize.query(
          `
            SELECT organization_id
            FROM exam_organization
            WHERE organization_id = :organizationId
            LIMIT 1
          `,
          {
            replacements: {
              organizationId,
            },
          }
        );

      if (examAssociations.length > 0) {
        return res.status(400).json({
          message:
            "This organization cannot be deleted because it is associated with one or more exams.",
        });
      }

      // -----------------------------------------------
      // Country selections are configuration data.
      // Remove them before deleting the unused org.
      // -----------------------------------------------

      await OrganizationCountries.destroy({
        where: {
          organization_id: organizationId,
        },
      });

      await organization.destroy();

      return res.status(200).json({
        message:
          "Organization deleted successfully.",
      });
    } catch (err) {
      console.error(
        "Delete Organization Error:",
        err
      );

      return res.status(500).json({
        message:
          "Failed to delete organization.",
        error: err.message,
      });
    }
  }
);

router.get("/accessible", auth, async (req, res) => {
  try {
    const user = req.user;
    console.log("USER:", user);
    // SUPER ADMIN
    if (user.roleId === 3) {
      const orgs = await Organizations.findAll({
        attributes: [
          "id",
          "name",
          [
            Sequelize.fn(
              "COUNT",
              Sequelize.col("users.id")
            ),
            "userCount",
          ],
        ],
        include: [
          {
            model: Users,
            as: "users",
            attributes: [],
            required: false,
          },
        ],
        group: ["Organizations.id"],
        order: [["name", "ASC"]],
      });
      return res.json({ organizations: orgs });
    }

    // ADMIN → orgs assigned via permissions
    if (user.roleId === 2) {
      const perms = await AdminPermissions.findAll({
        where: { admin_id: user.id },
        attributes: ["organization_id"],
      });

      const orgIds = perms.map((p) => p.organization_id);

      const orgs = await Organizations.findAll({
        where: { id: orgIds },
        attributes: [
          "id",
          "name",
          [
            Sequelize.fn(
              "COUNT",
              Sequelize.col("users.id")
            ),
            "userCount",
          ],
        ],
        include: [
          {
            model: Users,
            as: "users",
            attributes: [],
            required: false,
          },
        ],
        group: ["Organizations.id"],
        order: [["name", "ASC"]],
      });

      return res.json({ organizations: orgs });
    }

    // USER → empty list
    return res.json({ organizations: [] });

  } catch (err) {
    console.error("Accessible Orgs Error:", err);
    res.status(500).json({ message: "Failed to load organizations." });
  }
});

module.exports = router;