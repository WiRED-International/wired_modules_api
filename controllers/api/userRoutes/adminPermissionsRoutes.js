const router = require('express').Router();
const { AdminPermissions, Users, Roles } = require('../../../models');
const isSuperAdmin = require('../../../middleware/isSuperAdmin');

router.get('/', isSuperAdmin, async (req, res) => {
    const { adminId, countryId, cityId, organizationId, roleId } = req.query;

    try {
        const where = {
            ...(adminId && { admin_id: adminId }),
            ...(countryId && { country_id: countryId }),
            ...(cityId && { city_id: cityId }),
            ...(organizationId && { organization_id: organizationId }),
            ...(roleId && { role_id: roleId }),
        };

        const permissions = await AdminPermissions.findAll({
            where,
            attributes: ['id', 'country_id', 'city_id', 'organization_id', 'role_id', 'admin_id'],
            include: [
                {
                    model: Users, 
                    as: 'admin', //this matches the alias in the associations
                    attributes: ['first_name', 'last_name'], 
                },
                {
                    model: Roles, 
                    as: 'role', //this matches the alias in the associations
                    attributes: ['name'], 
                },
            ],
        });

        res.status(200).json(permissions);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/', isSuperAdmin, async (req, res) => {
    const { adminId, countryId, cityId, organizationId, roleId } = req.body;

    try {
        const admin = await Users.findByPk(adminId);
        if (!admin || admin.role_id !== 2) {
            return res.status(400).json({ message: 'Invalid admin ID or the user is not an admin.' });
        }

        // Check for duplicate permissions
        const existingPermission = await AdminPermissions.findOne({
            where: {
                admin_id: adminId,
                country_id: countryId,
                city_id: cityId,
                organization_id: organizationId,
                role_id: roleId,
            },
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
            role_id: roleId,
        });

        res.status(201).json(newPermission);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.put('/:id', isSuperAdmin, async (req, res) => {
    const { id } = req.params;
    const { countryId, cityId, organizationId, roleId } = req.body;

    try {
        const permission = await AdminPermissions.findByPk(id);

        if (!permission) {
            return res.status(404).json({ message: 'Permission not found' });
        }

        // Check for duplicate permissions
        const duplicatePermission = await AdminPermissions.findOne({
            where: {
                admin_id: permission.admin_id,
                country_id: countryId,
                city_id: cityId,
                organization_id: organizationId,
                role_id: roleId,
                id: { [Op.ne]: id }, // Exclude the current permission being updated
            },
        });

        if (duplicatePermission) {
            return res.status(400).json({ message: 'Duplicate permission exists.' });
        }

        // Update the permission
        await permission.update({
            country_id: countryId,
            city_id: cityId,
            organization_id: organizationId,
            role_id: roleId,
        });

        res.status(200).json({ message: 'Permission updated successfully', permission });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.delete('/:id', isSuperAdmin, async (req, res) => {
    const { id } = req.params;

    try {
        // Find the permission
        const permission = await AdminPermissions.findByPk(id);

        if (!permission) {
            return res.status(404).json({ message: 'Permission not found' });
        }

        // Delete the permission
        await permission.destroy();

        res.status(200).json({ message: 'Permission deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;