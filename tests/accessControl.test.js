const { buildUserQueryFilters } = require('../middleware/accessControl');

describe('buildUserQueryFilters', () => {
  const adminUserWithCity = {
    roleId: 2, // ADMIN_ROLE_ID
    organization_id: 1,
    country_id: 10,
    city_id: 100, // Admin assigned to a city
  };

  const adminUserWithoutCity = {
    roleId: 2,
    organization_id: 1,
    country_id: 10,
    city_id: null, // No city restriction
  };

  const superAdminUser = {
    roleId: 3, // SUPER_ADMIN_ROLE_ID
  };

  test('Admin with city assigned should include city filter', () => {
    const req = { user: adminUserWithCity };
    const filters = buildUserQueryFilters(req, {});

    expect(filters).toEqual({
      organization_id: 1,
      country_id: 10,
      city_id: 100,
      role_id: 1, 
    });
  });

  test('Admin without city assigned should exclude city filter', () => {
    const req = { user: adminUserWithoutCity };
    const filters = buildUserQueryFilters(req, {});

    expect(filters).toEqual({
      organization_id: 1,
      country_id: 10,
      role_id: 1,
    });
  });

  test('Admin should only be able to view regular users in their scope', () => {
    const req = { user: adminUserWithCity };
    const filters = buildUserQueryFilters(req, {});

    expect(filters).toEqual({
      organization_id: 1,
      country_id: 10,
      city_id: 100,
      role_id: 1, 
    });
  });

  test('Admin attempting to override roleId filter should throw error', () => {
    const req = { user: adminUserWithCity };

    expect(() => 
      buildUserQueryFilters(req, { roleId: 2 })
    ).toThrow("Admins can only view users with role 'User'.");
  });

  test('Admin attempting to filter outside assigned country should throw error', () => {
    const req = { user: adminUserWithCity };

    expect(() => 
      buildUserQueryFilters(req, { countryId: 99 })
    ).toThrow("Admins can only filter within their assigned country and organization.");
  });

  test('Admin with city assigned attempting to filter outside assigned city should throw error', () => {
    const req = { user: adminUserWithCity };

    expect(() => 
      buildUserQueryFilters(req, { cityId: 999 })
    ).toThrow("Admins can only filter within their assigned city.");
  });

  test('Super Admin should be able to apply any filters', () => {
    const req = { user: superAdminUser };
    const filters = buildUserQueryFilters(req, { countryId: 20, cityId: 200, organizationId: 2, roleId: 3 });

    expect(filters).toEqual({
      country_id: 20,
      city_id: 200,
      organization_id: 2,
      role_id: 3,
    });
  });

  test('Non-admin, non-super admin should throw permission error', () => {
    const req = { user: { roleId: 99 } };

    expect(() => 
      buildUserQueryFilters(req, {})
    ).toThrow("You do not have permission to perform this action.");
  });

  test('Missing req.user should throw an error', () => {
    const req = {};

    expect(() => 
      buildUserQueryFilters(req, {})
    ).toThrow("Cannot read properties of undefined (reading 'roleId')");
  });

  test('Admin attempts to pass non-integer roleId should throw error', () => {
    const req = { user: adminUserWithCity };

    expect(() => 
      buildUserQueryFilters(req, { roleId: "admin" })
    ).toThrow("Admins can only view users with role 'User'.");
  });

  test('Admin tries to access Super Admin role (roleId = 3) should throw error', () => {
    const req = { user: adminUserWithCity };

    expect(() => 
      buildUserQueryFilters(req, { roleId: 3 })
    ).toThrow("Admins can only view users with role 'User'.");
  });

  test('Super Admin applies no filters and receives empty filters object', () => {
    const req = { user: superAdminUser };
    const filters = buildUserQueryFilters(req, {});
    
    expect(filters).toEqual({});
  });
});
