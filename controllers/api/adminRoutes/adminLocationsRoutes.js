const router = require('express').Router();

const {
  Locations,
  Countries,
  Classes,
} = require('../../../models');

const { Op } = require('sequelize');

const auth = require('../../../middleware/auth');
const requireRoles = require('../../../middleware/requireRoles');
const ROLES = require('../../../utils/roles');

/**
 * GET /api/admin/locations
 *
 * Get standardized locations.
 * Supports filtering by:
 * - search query
 * - country
 * - location type
 * - parent location
 */
router.get(
  '/',
  auth,
  requireRoles(
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES.INSTRUCTOR
  ),
  async (req, res) => {
    const {
      query,
      countryId,
      locationType,
      parentLocationId,
      page,
      limit,
      sortBy = 'name',
      sortDirection = 'asc',
    } = req.query;

    const allowedSortFields = [
      'name',
      'location_type',
      'country',
    ];

    const normalizedSortBy =
      allowedSortFields.includes(sortBy)
        ? sortBy
        : 'name';

    const normalizedSortDirection =
      String(sortDirection).toLowerCase() === 'desc'
        ? 'DESC'
        : 'ASC';

    const pageNumber =
      page !== undefined ? Number(page) : null;

    const pageLimit =
      limit !== undefined ? Number(limit) : null;

    try {
      const where = {};

      if (query) {
        where.name = {
          [Op.like]: `%${query}%`,
        };
      }

      if (countryId) {
        where.country_id = Number(countryId);
      }

      if (locationType) {
        where.location_type = locationType;
      }

      if (parentLocationId) {
        where.parent_location_id = Number(parentLocationId);
      }

      const usePagination =
        Number.isSafeInteger(pageNumber) &&
        pageNumber > 0 &&
        Number.isSafeInteger(pageLimit) &&
        pageLimit > 0;

      const offset = usePagination
        ? (pageNumber - 1) * pageLimit
        : undefined;
      
      const total = usePagination
        ? await Locations.count({
            where,
          })
        : null;

      const locations = await Locations.findAll({
        where,
        limit: usePagination ? pageLimit : undefined,
        offset,
        attributes: [
          'id',
          'name',
          'country_id',
          'location_type',
          'parent_location_id',
        ],
        include: [
          {
            model: Countries,
            as: 'country',
            attributes: ['id', 'name', 'code'],
          },
        ],
        order:
          normalizedSortBy === 'country'
            ? [
                [
                  { model: Countries, as: 'country' },
                  'name',
                  normalizedSortDirection,
                ],
              ]
            : [
                [
                  normalizedSortBy,
                  normalizedSortDirection,
                ],
              ],
      });

      if (usePagination) {
        return res.status(200).json({
          locations,
          pagination: {
            page: pageNumber,
            limit: pageLimit,
            total,
            totalPages: Math.ceil(total / pageLimit),
          },
        });
      }

      return res.status(200).json(locations);
    } catch (err) {
      console.error('Get locations error:', err);

      return res.status(500).json({
        message: 'Failed to load locations.',
        error: err.message,
      });
    }
  }
);

/**
 * POST /api/admin/locations
 *
 * Create a standardized location.
 */
router.post(
  '/',
  auth,
  requireRoles(ROLES.SUPER_ADMIN),
  async (req, res) => {
    const {
      name,
      country_id,
      location_type,
      parent_location_id,
    } = req.body;

    try {
      // Required fields.
      if (!name || !country_id || !location_type) {
        return res.status(400).json({
          message: 'Name, country, and location type are required.',
        });
      }

      // Validate location type.
      const allowedLocationTypes = [
        'county',
        'sub_county',
        'city',
      ];

      if (!allowedLocationTypes.includes(location_type)) {
        return res.status(400).json({
          message: 'Invalid location type.',
        });
      }

      // Ensure country exists.
      const country = await Countries.findByPk(country_id);

      if (!country) {
        return res.status(404).json({
          message: 'Country not found.',
        });
      }

      let parentLocation = null;

      // If a parent was supplied, ensure it exists
      // and belongs to the same country.
      if (parent_location_id) {
        parentLocation = await Locations.findByPk(
          parent_location_id
        );

        if (!parentLocation) {
          return res.status(404).json({
            message: 'Parent location not found.',
          });
        }

        if (
          parentLocation.country_id !== Number(country_id)
        ) {
          return res.status(400).json({
            message:
              'Parent location must belong to the same country.',
          });
        }
      }

      // Prevent duplicate standardized locations.
      const existingLocation = await Locations.findOne({
        where: {
          name: name.trim(),
          country_id: Number(country_id),
          location_type,
          parent_location_id: parent_location_id
            ? Number(parent_location_id)
            : null,
        },
      });

      if (existingLocation) {
        return res.status(400).json({
          message: 'This location already exists.',
        });
      }

      const location = await Locations.create({
        name: name.trim(),
        country_id: Number(country_id),
        location_type,
        parent_location_id: parent_location_id
          ? Number(parent_location_id)
          : null,
      });

      return res.status(201).json({
        message: 'Location created successfully.',
        location,
      });
    } catch (err) {
      console.error('Create location error:', err);

      return res.status(500).json({
        message: 'Failed to create location.',
        error: err.message,
      });
    }
  }
);

/**
 * PUT /api/admin/locations/:locationId
 *
 * Update a standardized location.
 */
router.put(
  '/:locationId',
  auth,
  requireRoles(ROLES.SUPER_ADMIN),
  async (req, res) => {
    const locationId = Number(req.params.locationId);

    const {
      name,
      country_id,
      location_type,
      parent_location_id,
    } = req.body;

    try {
      if (
        !Number.isSafeInteger(locationId) ||
        locationId <= 0
      ) {
        return res.status(400).json({
          message: 'Valid location ID is required.',
        });
      }

      if (!name || !country_id || !location_type) {
        return res.status(400).json({
          message:
            'Name, country, and location type are required.',
        });
      }

      const allowedLocationTypes = [
        'county',
        'sub_county',
        'city',
      ];

      if (!allowedLocationTypes.includes(location_type)) {
        return res.status(400).json({
          message: 'Invalid location type.',
        });
      }

      const location = await Locations.findByPk(locationId);

      if (!location) {
        return res.status(404).json({
          message: 'Location not found.',
        });
      }

      const country = await Countries.findByPk(country_id);

      if (!country) {
        return res.status(404).json({
          message: 'Country not found.',
        });
      }

      let normalizedParentLocationId = null;

      if (parent_location_id) {
        normalizedParentLocationId =
          Number(parent_location_id);

        if (normalizedParentLocationId === locationId) {
          return res.status(400).json({
            message:
              'A location cannot be its own parent.',
          });
        }

        const parentLocation = await Locations.findByPk(
          normalizedParentLocationId
        );

        if (!parentLocation) {
          return res.status(404).json({
            message: 'Parent location not found.',
          });
        }

        if (
          parentLocation.country_id !== Number(country_id)
        ) {
          return res.status(400).json({
            message:
              'Parent location must belong to the same country.',
          });
        }
      }

      const duplicateLocation = await Locations.findOne({
        where: {
          name: name.trim(),
          country_id: Number(country_id),
          location_type,
          parent_location_id:
            normalizedParentLocationId,
          id: {
            [Op.ne]: locationId,
          },
        },
      });

      if (duplicateLocation) {
        return res.status(400).json({
          message: 'This location already exists.',
        });
      }

      await location.update({
        name: name.trim(),
        country_id: Number(country_id),
        location_type,
        parent_location_id:
          normalizedParentLocationId,
      });

      return res.status(200).json({
        message: 'Location updated successfully.',
        location,
      });
    } catch (err) {
      console.error('Update location error:', err);

      return res.status(500).json({
        message: 'Failed to update location.',
        error: err.message,
      });
    }
  }
);

/**
 * DELETE /api/admin/locations/:locationId
 *
 * Delete a standardized location only if it is not
 * currently referenced by a class.
 */
router.delete(
  '/:locationId',
  auth,
  requireRoles(ROLES.SUPER_ADMIN),
  async (req, res) => {
    const locationId = Number(req.params.locationId);

    try {
      if (
        !Number.isSafeInteger(locationId) ||
        locationId <= 0
      ) {
        return res.status(400).json({
          message: 'Valid location ID is required.',
        });
      }

      const location = await Locations.findByPk(
        locationId
      );

      if (!location) {
        return res.status(404).json({
          message: 'Location not found.',
        });
      }

      const classCount = await Classes.count({
        where: {
          location_id: locationId,
        },
      });

      if (classCount > 0) {
        return res.status(400).json({
          message:
            'This location cannot be deleted because it is used by one or more classes.',
        });
      }

      const childLocationCount = await Locations.count({
        where: {
          parent_location_id: locationId,
        },
      });

      if (childLocationCount > 0) {
        return res.status(400).json({
          message:
            'This location cannot be deleted because it is the parent of one or more locations.',
        });
      }

      await location.destroy();

      return res.status(200).json({
        message: 'Location deleted successfully.',
      });
    } catch (err) {
      console.error('Delete location error:', err);

      return res.status(500).json({
        message: 'Failed to delete location.',
        error: err.message,
      });
    }
  }
);

module.exports = router;