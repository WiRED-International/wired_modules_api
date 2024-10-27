const router = require('express').Router();
const Alerts = require('../../models/alerts');

router.get('/', async (req, res) => {
  try {
    const alerts = await Alerts.findAll();
    res.status(200).json(alerts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/latest', async (req, res) => {
  try {
    const alert = await Alerts.findOne({
        order: [['created_at', 'DESC']],
        limit: 1,
    });
    if (!alert) {
      return res.status(404).json({ message: 'Alert not found' });
    }
    res.status(200).json(alert);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const alert = await Alerts.findByPk(req.params.id);
    if (!alert) {
      return res.status(404).json({ message: 'Alert not found' });
    }
    res.status(200).json(alert);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', async (req, res) => {
    const { alert, } = req.body;
  try {

    const newAlert = await Alerts.create({
        alert,
      });

    res.status(201).json({ alert: newAlert });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', async (req, res) => {
    const { alert } = req.body;

    try {
        const alertUpdate = await Alerts.findByPk(req.params.id);
        if (!alert) {
            return res.status(404).json({ message: 'Alert not found' });
        }
        await alertUpdate.update({
            alert
        });

        res.status(200).json({ message: "Alert updated successfully", alertUpdate });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const alert = await Alerts.findByPk(req.params.id);
        if (!alert) {
            return res.status(404).json({ message: 'Alert not found' });
        }
        await alert.destroy();
        res.status(200).json({ message: 'Alert deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
