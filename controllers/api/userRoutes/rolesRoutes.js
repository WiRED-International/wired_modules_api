const router = require('express').Router();
const { Roles } = require('../../../models');

router.get('/', async (req, res) => {
    try {
        const roles = await Roles.findAll();
        res.status(200).json(roles);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/', async (req, res) => {
    const { name } = req.body;

    try {
        const newRole = await Roles.create({
            name,
        });

        res.status(200).json(newRole);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;

    try {
        const role = await Roles.findByPk(id);

        if (!role) {
            return res.status(404).json({ message: 'Role not found' });
        }

        await role.update({
            name,
        });

        res.status(200).json({ message: 'Role updated successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const role = await Roles.findByPk(id);

        if (!role) {
            return res.status(404).json({ message: 'Role not found' });
        }

        await role.destroy();
        res.status(200).json({ message: 'Role deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});      

module.exports = router;