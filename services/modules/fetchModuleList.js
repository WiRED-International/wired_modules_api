const {
  Modules,
  SubCategories,
  Categories,
  Letters,
  Keywords,
  Programs,
  Specializations,
} = require('../../models');

async function fetchModuleList({
  subcategoryId,
  type,
  includeArchived = false,
} = {}) {
  const typeFilter =
    typeof type === 'string' ? type.trim().toLowerCase() : undefined;

  const whereClause = {};

  if (typeFilter && ['module', 'animation'].includes(typeFilter)) {
    whereClause.type = typeFilter;
  }

  if (!includeArchived) {
    whereClause.is_archived = false;
  }

  return Modules.findAll({
    where: whereClause,
    distinct: true,
    order: [['name', 'ASC']],
    attributes: [
      'id',
      'module_id',
      'name',
      'description',
      'version',
      'downloadLink',
      'language',
      'packageSize',
      'content_updated_at',
      'package_uploaded_at',
      'type',
      'has_quiz',
      'is_archived',
      'credit_type',
      'cme_credits',
    ],
    include: [
      {
        model: Modules,
        as: 'redirectedModule',
        attributes: [
          'id',
          'name',
          'module_id',
          'description',
          'downloadLink',
          'language',
        ],
      },
      {
        model: SubCategories,
        as: 'subCategories',
        attributes: ['id', 'name', 'category_id'],
        through: { attributes: [] },
        include: [
          {
            model: Categories,
            as: 'category',
            attributes: ['id', 'name'],
          },
        ],
        ...(subcategoryId ? { where: { id: subcategoryId } } : {}),
      },
      {
        model: Letters,
        as: 'letters',
        attributes: ['id', 'letters'],
      },
      {
        model: Keywords,
        as: 'keywords',
        attributes: ['id', 'name'],
        through: { attributes: [] },
      },
      {
        model: Programs,
        as: 'programs',
        attributes: ['id', 'name', 'training_type'],
        through: { attributes: [] },
      },
      {
        model: Specializations,
        as: 'specializations',
        attributes: ['id', 'name'],
        through: { attributes: [] },
      },
    ],
  });
}

module.exports = fetchModuleList;