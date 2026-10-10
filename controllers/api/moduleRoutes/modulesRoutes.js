const router = require('express').Router();
const { sequelize } = require('../../../models');
const {
  Modules,
  SubCategories,
  Categories,
  Letters,
  Keywords,
  Programs,
  Specializations,
} = require('../../../models');

// ============================================
// 🔹 GET all modules
// ============================================
router.get('/', async (req, res) => {
  const { subcategoryId, type } = req.query;

  try {
    const typeFilter = typeof type === 'string' ? type.trim().toLowerCase() : undefined;
    const whereClause = {};
    if (typeFilter && ['module', 'animation'].includes(typeFilter)) {
      whereClause.type = typeFilter; // ENUM('module','animation')
    }

    const queryOptions = {
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
        'credit_type',
        'cme_credits',
      ],
      include: [
        {
          model: Modules,
          as: 'redirectedModule',
          attributes: ['id', 'name', 'module_id', 'description', 'downloadLink', 'language',],
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
          attributes: ['id', 'letters'] 
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
    };

    const modules = await Modules.findAll(queryOptions);
    res.status(200).json(modules);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ============================================
// 🔹 GET module names only
// ============================================
router.get('/names', async (req, res) => {
  try {
    const modules = await Modules.findAll({
      attributes: ['id', 'module_id', 'name', 'credit_type', 'cme_credits', 'categories'],
      order: [['name', 'ASC']], 
    });
    res.status(200).json(modules);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const module = await Modules.findByPk(req.params.id, {
        include: [
            {
                model: Modules,
                as: 'redirectedModule',
                attributes: ['id', 'name', 'module_id', 'description', 'downloadLink', 'language'],
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
            },
            {
              model: Letters,
              as: 'letters',
              attributes: ['id', 'letters'],
              through: { attributes: [] },
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
    if (!module) {
      return res.status(404).json({ message: 'Module not found' });
    }
    res.status(200).json(module);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', async (req, res) => {
    const {
      name,
      module_id,
      description,
      version,
      downloadLink,
      language,
      packageSize,
      content_updated_at,
      redirect_module_id,
      type,
      has_quiz,
      credit_type,
      cme_credits,
      categories,
      program_ids,
      specialization_ids,
      letter_ids,
      subcategory_ids,
      keyword_ids,
    } = req.body;
  try {

    if (
      credit_type === 'cme' &&
      (
        cme_credits === undefined ||
        cme_credits === '' ||
        cme_credits === null ||
        !Number.isInteger(Number(cme_credits)) ||
        Number(cme_credits) < 1
      )
    ) {
      return res.status(400).json({
        message: 'CME credits must be a positive whole number for CME modules.',
      });
    }

    if (
      credit_type !== 'none' &&
      cme_credits !== undefined &&
      cme_credits !== null &&
      (
        cme_credits === '' ||
        !Number.isInteger(Number(cme_credits)) ||
        Number(cme_credits) < 1
      )
    ) {
      return res.status(400).json({
        message: 'CME credits must be a positive whole number.',
      });
    }

    const relationshipFields = [
      ['program_ids', program_ids],
      ['specialization_ids', specialization_ids],
      ['letter_ids', letter_ids],
      ['subcategory_ids', subcategory_ids],
      ['keyword_ids', keyword_ids],
    ];

    for (const [fieldName, value] of relationshipFields) {
      if (value !== undefined && !Array.isArray(value)) {
        return res.status(400).json({
          message: `${fieldName} must be an array.`,
        });
      }
    }

    const newModule = await Modules.create({
        name,
        module_id,
        description,
        version,
        downloadLink,
        language,
        packageSize,
        content_updated_at: content_updated_at ?? null,
        package_uploaded_at: downloadLink ? new Date() : null,
        redirect_module_id,
        type,
        has_quiz,
        credit_type,
        cme_credits:
          credit_type === 'none'
            ? null
            : cme_credits,
        categories,
      });

    if (program_ids !== undefined) {
      await newModule.setPrograms(program_ids);
    }

    if (specialization_ids !== undefined) {
      await newModule.setSpecializations(specialization_ids);
    }

    if (letter_ids !== undefined) {
      await newModule.setLetters(letter_ids);
    }

    if (subcategory_ids !== undefined) {
      await newModule.setSubCategories(subcategory_ids);
    }

    if (keyword_ids !== undefined) {
      await newModule.setKeywords(keyword_ids);
    }

    res.status(201).json({ module: newModule });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', async (req, res) => {
    const {
      name,
      module_id,
      description,
      version,
      downloadLink,
      language,
      packageSize,
      content_updated_at,
      redirect_module_id,
      type,
      has_quiz,
      credit_type,
      cme_credits,
      categories,
      program_ids,
      specialization_ids,
      letter_ids,
      subcategory_ids,
      keyword_ids,
    } = req.body;
  try {

    const effectiveCreditType =
      credit_type !== undefined
        ? credit_type
        : undefined;

    if (
      effectiveCreditType === 'cme' &&
      (
        cme_credits === undefined ||
        cme_credits === '' ||
        cme_credits === null ||
        !Number.isInteger(Number(cme_credits)) ||
        Number(cme_credits) < 1
      )
    ) {
      return res.status(400).json({
        message: 'CME credits must be a positive whole number for CME modules.',
      });
    }

    if (
      effectiveCreditType !== 'none' &&
      cme_credits !== undefined &&
      cme_credits !== null &&
      (
        cme_credits === '' ||
        !Number.isInteger(Number(cme_credits)) ||
        Number(cme_credits) < 1
      )
    ) {
      return res.status(400).json({
        message: 'CME credits must be a positive whole number.',
      });
    }

    // Validate all relationship fields before updating the database.
    const relationshipFields = [
      ['program_ids', program_ids],
      ['specialization_ids', specialization_ids],
      ['letter_ids', letter_ids],
      ['subcategory_ids', subcategory_ids],
      ['keyword_ids', keyword_ids],
    ];

    for (const [fieldName, value] of relationshipFields) {
      if (value !== undefined && !Array.isArray(value)) {
        return res.status(400).json({
          message: `${fieldName} must be an array.`,
        });
      }
    }

    const module = await Modules.findByPk(req.params.id);
    if (!module) {
      return res.status(404).json({ message: 'Module not found' });
    }
    const updates = {};

    if (name !== undefined) {
      updates.name = name;
    }

    if (module_id !== undefined) {
      updates.module_id = module_id;
    }

    if (description !== undefined) {
      updates.description = description;
    }

    if (version !== undefined) {
      updates.version = version;
    }

    if (downloadLink !== undefined) {
      updates.downloadLink = downloadLink;
    }

    if (language !== undefined) {
      updates.language = language;
    }

    if (packageSize !== undefined) {
      updates.packageSize = packageSize;
    }

    if (content_updated_at !== undefined) {
      const validDate =
        content_updated_at === null ||
        (
          typeof content_updated_at === 'string' &&
          /^\d{4}-\d{2}-\d{2}$/.test(content_updated_at) &&
          !Number.isNaN(Date.parse(content_updated_at)) &&
          new Date(content_updated_at).toISOString().slice(0, 10) ===
            content_updated_at
        );

      if (!validDate) {
        return res.status(400).json({
          message: 'Content Updated must be a valid YYYY-MM-DD date or null.',
        });
      }

      updates.content_updated_at = content_updated_at;
    }

    if (redirect_module_id !== undefined) {
      updates.redirect_module_id = redirect_module_id;
    }

    if (type !== undefined) {
      updates.type = type;
    }

    if (has_quiz !== undefined) {
      updates.has_quiz = has_quiz;
    }

    if (credit_type !== undefined) {
      updates.credit_type = credit_type;

      if (credit_type === 'none') {
        updates.cme_credits = null;
      }
    }

    if (
      cme_credits !== undefined &&
      credit_type !== 'none'
    ) {
      updates.cme_credits = cme_credits;
    }

    if (categories !== undefined) {
      updates.categories = categories;
    }

    await module.sequelize.transaction(async (transaction) => {
      await module.update(updates, { transaction });

      if (program_ids !== undefined) {
        await module.setPrograms(program_ids, { transaction });
      }

      if (specialization_ids !== undefined) {
        await module.setSpecializations(specialization_ids, { transaction });
      }

      if (letter_ids !== undefined) {
        await module.setLetters(letter_ids, { transaction });
      }

      if (subcategory_ids !== undefined) {
        await module.setSubCategories(subcategory_ids, { transaction });
      }

      if (keyword_ids !== undefined) {
        await module.setKeywords(keyword_ids, { transaction });
      }
    });

    res.status(200).json({ message: "Module updated successfully", module});
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;