const router = require("express").Router();
const { Organizations, AdminPermissions } = require("../../../models");
const auth = require("../../../middleware/auth");

router.get("/accessible", auth, async (req, res) => {
  try {
    const user = req.user;

    // SUPER ADMIN
    if (user.role_id === 3) {
      const orgs = await Organizations.findAll({
        attributes: ["id", "name"],
        order: [["name", "ASC"]],
      });
      return res.json({ organizations: orgs });
    }

    // ADMIN → orgs assigned via permissions
    if (user.role_id === 2) {
      const perms = await AdminPermissions.findAll({
        where: { admin_id: user.id },
        attributes: ["organization_id"],
      });

      const orgIds = perms.map((p) => p.organization_id);

      const orgs = await Organizations.findAll({
        where: { id: orgIds },
        attributes: ["id", "name"],
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