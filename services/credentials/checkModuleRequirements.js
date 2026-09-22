const {
  Programs,
  Specializations,
  QuizScores,
} = require('../../models');

async function checkModuleRequirements({
  userId,
  programId,
  specializationId = null,
}) {
  const program = await Programs.findByPk(programId);

  if (!program) {
    throw new Error(`Program not found: ${programId}`);
  }

  let modules = await program.getModules({
    where: { has_quiz: true },
    attributes: ['id', 'module_id', 'name', 'has_quiz'],
    through: { attributes: [] },
  });

  if (program.training_type === 'specialization') {
    if (!specializationId) {
      throw new Error('A specialization is required.');
    }

    const specialization = await Specializations.findByPk(specializationId);

    if (!specialization) {
      throw new Error(`Specialization not found: ${specializationId}`);
    }

    const specialtyModules = await specialization.getModules({
      attributes: ['id'],
      through: { attributes: [] },
    });

    const specialtyModuleIds = new Set(
      specialtyModules.map((module) => module.id)
    );

    modules = modules.filter((module) =>
      specialtyModuleIds.has(module.id)
    );
  }

  const moduleIds = modules.map((module) => module.id);

  const scores = moduleIds.length
    ? await QuizScores.findAll({
        where: {
          user_id: userId,
          module_id: moduleIds,
        },
        attributes: ['module_id', 'score', 'date_taken'],
      })
    : [];

  const scoresByModuleId = new Map(
    scores.map((score) => [score.module_id, score])
  );

  const requirements = modules.map((module) => {
    const scoreRecord = scoresByModuleId.get(module.id);
    const score = scoreRecord ? scoreRecord.score : null;

    return {
      module_id: module.id,
      external_module_id: module.module_id,
      name: module.name,
      score,
      date_taken: scoreRecord?.date_taken || null,
      passed: score !== null && score >= 80,
    };
  });

  const passedCount = requirements.filter(
    (requirement) => requirement.passed
  ).length;

  return {
    program_id: program.id,
    program_name: program.name,
    specialization_id: specializationId,
    required_count: requirements.length,
    passed_count: passedCount,
    all_passed:
      requirements.length > 0 &&
      passedCount === requirements.length,
    requirements,
  };
}

module.exports = checkModuleRequirements;