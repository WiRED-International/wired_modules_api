const router = require('express').Router();
const isSuperAdmin = require('../../../middleware/isSuperAdmin');
const { Downloads, Modules, Packages, Users } = require('../../../models')
const { Op } = require('sequelize');

// Get all downloads
router.get('/', isSuperAdmin, async (req, res) => {
    try {
        // Extract query parameters from the request
        const { module_id, package_id, user_id, latitude, longitude, date_before, date_after, module_name, package_name, sort_by='package', sort_dir = 'DESC' } = req.query;

        // Build the filtering criteria dynamically
        const whereConditions = {};
        if (module_id) whereConditions.module_id = module_id;
        if (package_id) whereConditions.package_id = package_id;
        if (user_id) whereConditions.user_id = user_id;
        if (latitude) whereConditions.latitude = latitude;
        if (longitude) whereConditions.longitude = longitude;

        if (sort_by === 'module') {
            whereConditions.package_id = { [Op.is]: null };
        } else if (sort_by === 'package') {
            whereConditions.module_id = { [Op.is]: null };
        }

        //filtering by date
        if (date_before) {
            whereConditions.download_date = {
                ...whereConditions.download_date, // Merge existing conditions if any
                [Op.lte]: new Date(date_before), // `lte` means less than or equal
            };
        }
        if (date_after) {
            whereConditions.download_date = {
                ...whereConditions.download_date,
                [Op.gte]: new Date(date_after), // `gte` means greater than or equal
            };
        }
        //dynamically include the module and package models depending on the query parameters
        const moduleInclude = {
            model: Modules,
            as: 'module', 
        };

        if (module_name) {
            moduleInclude.where = { name: { [Op.like]: `%${module_name}%` } };
        }
        const packageInclude = {
            model: Packages,
            as: 'package',
        }
        if (package_name) {
            packageInclude.where = { name: { [Op.like]: `%${package_name}%` } };
        }
        //determine sorting order
        const order = [];
        if (sort_by) {
            const direction = sort_dir && sort_dir.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
            console.log('direction:', direction)    
            if (sort_by === 'module') {
                console.log('here!')
                // Sort by module name from the associated Modules table
                order.push([{ model: Modules, as: 'module' }, 'name', direction]);
            } else if (sort_by === 'package') {
                // Sort by package name from the associated Packages table
                order.push([{model: Packages, as: 'package'}, 'name', direction]);
            }
            // order.push([sort_by, sort_dir || 'ASC']);
        }
        // Fetch data with filters applied
        const downloadData = await Downloads.findAll({
            where: whereConditions,
            include: [
                moduleInclude,
                packageInclude,
                { model: Users, as: 'user', attributes: { exclude: ['password'] } },
            ],
            order,
        });

        res.status(200).json(downloadData);
    } catch (err) {
        console.log(err);
        res.status(500).json(err);
    }
});

// Get a specific download by id
router.get('/:id', isSuperAdmin, async (req, res) => {
    try {
        const { id } = req.params; 

        // Fetch the download record by its primary key (id)
        const downloadData = await Downloads.findByPk(id, {
            include: [
                { model: Modules, as: 'module' },
                { model: Packages, as: 'package' },
                { model: Users, as: 'user', attributes: { exclude: ['password'] } },
            ],
        });

        // If no record is found, return a 404 error
        if (!downloadData) {
            return res.status(404).json({ message: 'Download not found' });
        }

        // Return the found record
        res.status(200).json(downloadData);
    } catch (err) {
        console.log(err);
        res.status(500).json({err});
    }
});

//Create a new download
router.post('/', async (req, res) => {
    try {
        const newDownload = await Downloads.create(req.body);
        //validation of the fields occurs in the model, including making sure that at least one of module_id or package_id is provided
        res.status(200).json(newDownload);
    } catch (err) {
        console.log(err);
        res.status(500).json(err);
    }
});

// DELETE by id
router.delete('/:id', isSuperAdmin, async (req, res) => {
    try {
        const { id } = req.params; // Extract the ID from the URL parameter

        // Check if the ID is valid (you could add additional validation here if needed)
        if (!id) {
            return res.status(400).json({ message: 'ID parameter is required' });
        }

        // Find the download by ID
        const download = await Downloads.findByPk(id);

        if (!download) {
            return res.status(404).json({ message: 'Download not found' });
        }

        // Perform the delete operation
        await download.destroy();

        // Return success message
        res.status(200).json({ message: 'Download deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});



module.exports = router;