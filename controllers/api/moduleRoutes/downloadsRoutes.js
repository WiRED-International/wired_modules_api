const router = require('express').Router();
const isSuperAdmin = require('../../../middleware/isSuperAdmin');
const { Downloads, Modules, Packages, Users, Countries } = require('../../../models')
const { Op } = require('sequelize');
const Sequelize = require('sequelize');
const getCountryCode = require('../../../utils/getCountryCode');
const { Parser } = require('json2csv');
const  {formatDate, formatTime}  = require('../../../utils/formatDate');

// Get all downloads
router.get('/', isSuperAdmin, async (req, res) => {
    try {
        // Extract query parameters from the request
        const { module_id, package_id, user_id, latitude, longitude, start_date, end_date, module_name, package_name, sort_by, sort_dir, distance, country_code, output } = req.query;

        // Build the filtering criteria dynamically
        const whereConditions = {};
        if (module_id) whereConditions.module_id = module_id;
        if (package_id) whereConditions.package_id = package_id;
        if (user_id) whereConditions.user_id = user_id;
        if (country_code) whereConditions.country_code = country_code;
        // Ensure latitude and longitude are not null for the general downloads querying
        whereConditions.latitude = { [Op.ne]: null };
        whereConditions.longitude = { [Op.ne]: null };

        // if the user is sorting by module name, then we don't show results where module_id is null and vice versa for package
        if (sort_by === 'module') {
            whereConditions.package_id = { [Op.is]: null };
        } else if (sort_by === 'package') {
            whereConditions.module_id = { [Op.is]: null };
        }

        //filtering by date
        if (start_date) {
            whereConditions.download_date = {
                ...whereConditions.download_date,
                [Op.gte]: start_date, // `gte` means greater than or equal
            };
        }
        if (end_date) {
            whereConditions.download_date = {
                ...whereConditions.download_date, // Merge existing conditions if any
                [Op.lte]: end_date, // `lte` means less than or equal
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

            if (sort_by === 'module') {

                order.push([
                    Sequelize.literal(`COALESCE(module.name, 'ZZZ') ${direction}`)
                ]);
            } else if (sort_by === 'package') {
                order.push([
                    Sequelize.literal(`COALESCE(package.name, 'ZZZ') ${direction}`)
                ]);
            } else if (sort_by === 'date') {
                order.push(['download_date', direction]);
            }
        }
        //if the user has provided latitude, longitude, and distance, then we will filter the results based on the distance from the provided coordinates
        if (latitude && longitude && distance !== undefined) {
            const lat = parseFloat(latitude);
            const lon = parseFloat(longitude);
            const earthRadiusMiles = 3958.8; // Earth's radius in miles
            whereConditions[Op.and] = Sequelize.literal(`
                (${earthRadiusMiles} * acos(
                    cos(radians(${lat})) * cos(radians(Downloads.latitude)) * 
                    cos(radians(Downloads.longitude) - radians(${lon})) + 
                    sin(radians(${lat})) * sin(radians(Downloads.latitude))
                )) <= ${distance}
            `);
        }

        // Fetch data with filters applied
        const downloadData = await Downloads.findAll({
            where: whereConditions,
            include: [
                moduleInclude,
                packageInclude,
                { model: Users, as: 'user', attributes: { exclude: ['password'] } },
                { model: Countries, as: 'country' },
            ],
            order,
        });
        //if the output query parameter is set to csv, then we will return the data in csv format
        if (output === 'csv') {
            const fields = [ 'module_name', 'package_name','download_date', 'download_time','user_id', 'latitude', 'longitude', 'country', ];
            const json2csvParser = new Parser({ fields });

            const formattedData = downloadData.map((item) => ({
                module_name: item.module?.name,
                package_name: item.package?.name,
                user_id: item.user_id,
                latitude: item.latitude,
                longitude: item.longitude,
                country: item.country.name,
                download_time: formatTime(item.download_date),
                download_date: formatDate(item.download_date),
            }));
            
            const csv = json2csvParser.parse(formattedData);

            // Set the response headers for CSV download
            const id = new Date().getTime();
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=wired_health_downloads_${id}.csv`);

            // Send the CSV data as the response
            return res.status(200).send(csv);
        }
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
        res.status(500).json({ err });
    }
});

//Create a new download
router.post('/', async (req, res) => {
    try {
        const { module_id, package_id, user_id, latitude, longitude } = req.body;
        let { country_id, country_code } = req.body;

        if (!country_code) {
            country_code = await getCountryCode(req.body.latitude, req.body.longitude);
            if (!country_code) {
                country_code = null
            }
        }
        if (!country_id) {
            const country = await Countries.findOne({ where: { code: country_code } })
            if (!country) {
                country_id = null;
            } else {
                country_id = country.id;
            }
        }



        const newDownload = await Downloads.create({
            module_id,
            package_id,
            user_id,
            latitude,
            longitude,
            country_code,
            country_id: country_id,
        })

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