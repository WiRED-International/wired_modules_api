const router = require('express').Router();
const isSuperAdmin = require('../../middleware/isSuperAdmin');

router.get('/', isSuperAdmin, async (req, res) => {
    try {
        res.status(200).json({ googleAPIKey: process.env.GOOGLE_API_KEY });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
})

module.exports = router;
