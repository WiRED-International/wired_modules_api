const router = require("express").Router();

router.get("/", (req, res) => {
  res.json({
    message: "Partner API v1"
  });
});

module.exports = router;