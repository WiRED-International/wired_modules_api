const router = require('express').Router();
const { AdminPermissions } = require('../../../models');

router.get('/', async (req, res) => {
    const { adminId, countryId, cityId, organizationId } = req.query;

    try {
        const permissions = await AdminPermissions.findAll({
            where: {
                admin_id: adminId,
                country_id: countryId,
                city_id: cityId,
                organization_id: organizationId,
            },
            attributes: ['id', 'country_id', 'city_id', 'organization_id'],
        });
        res.status(200).json(permissions);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/', async (req, res) => {
    const { adminId, countryId, cityId, organizationId } = req.body;

    try {
        const existingPermission = await AdminPermissions.findOne({
            where: {
                admin_id: adminId,
                country_id: countryId,
                city_id: cityId,
                organization_id: organizationId,
            },
            attributes: ['id', 'country_id', 'city_id', 'organization_id'],
        });

        if (existingPermission) {
            return res.status(400).json({ message: 'Permission already exists for this admin.' });
          }
      
          // Create the permission
          const newPermission = await AdminPermissions.create({
            admin_id: adminId,
            country_id: countryId,
            city_id: cityId,
            organization_id: organizationId,
          });

        res.status(200).json(newPermission);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { adminId, countryId, cityId, organizationId } = req.body;

    try {
        const permission = await AdminPermissions.findByPk(id);

        if (!permission) {
            return res.status(404).json({ message: 'Permission not found' });
        }

        await permission.update({
            adminId,
            countryId,
            cityId,
            organizationId,
        });

        res.status(200).json({ message: 'Permission updated successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const permission = await AdminPermissions.findByPk(id);

        if (!permission) {
            return res.status(404).json({ message: 'Permission not found' });
        }

        await permission.destroy();
        res.status(200).json({ message: 'Permission deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;