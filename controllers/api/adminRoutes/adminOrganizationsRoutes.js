const router = require("express").Router();
const { Organizations, AdminPermissions, Users } = require("../../../models");
const auth = require("../../../middleware/auth");
const { Sequelize } = require("sequelize");

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