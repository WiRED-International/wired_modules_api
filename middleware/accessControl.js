const ROLES = require('../utils/roles');

function buildUserQueryFilters(req, allowedFilters = {}) {
  const userRoleId = req.user.roleId;
  const filters = {};

  if (userRoleId === ROLES.ADMIN) {
    // Admins can only view users in their assigned country, city, and organization
    filters.organization_id = req.user.organization_id;
    filters.country_id = req.user.country_id;
    
    if (req.user.city_id != null && req.user.city_id !== '') {
      filters.city_id = req.user.city_id;

      // Prevent filtering outside their city
      if (allowedFilters.cityId && allowedFilters.cityId != req.user.city_id) {
        throw new Error("Admins can only filter within their assigned city.");
      }
    }


    // Admins can only view Users
    filters.role_id = ROLES.USER;

    // Block attempts to override this restriction via query params
    if (allowedFilters.roleId && allowedFilters.roleId != ROLES.USER) {
      throw new Error("Admins can only view users with role 'User'.");
    }

    // Prevent filtering outside their assigned scope
    if (
      (allowedFilters.countryId && allowedFilters.countryId != req.user.country_id) ||
      (allowedFilters.organizationId && allowedFilters.organizationId != req.user.organization_id)
    ) {
      throw new Error("Admins can only filter within their assigned country and organization.");
    }

  } else if (userRoleId === ROLES.SUPER_ADMIN) {
    // Super Admin: Free to apply any filters
    if (allowedFilters.countryId) {
      filters.country_id = allowedFilters.countryId;
    }
    if (allowedFilters.cityId) {
      filters.city_id = allowedFilters.cityId;
    }
    if (allowedFilters.organizationId) {
      filters.organization_id = allowedFilters.organizationId;
    }
    if (allowedFilters.roleId) {
      filters.role_id = allowedFilters.roleId;
    }
  } else {
    throw new Error("You do not have permission to perform this action.");
  }

  return filters;
}

module.exports = { buildUserQueryFilters };

