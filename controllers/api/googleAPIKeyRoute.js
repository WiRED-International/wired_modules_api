const router = require('express').Router();
const isSuperAdmin = require('../../middleware/isSuperAdmin');

router.get('/', isSuperAdmin, async (req, res) => {
    console.log('google api route hit')
    console.log('process.env object: ', process.env)
    console.log('google api key: ', process.env.GOOGLE_API_KEY)
    try {
        res.status(200).json({ googleAPIKey: process.env.GOOGLE_API_KEY });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
})

module.exports = router;
