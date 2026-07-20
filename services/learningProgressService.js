const { QuizScores, Modules } = require("../models");

const BASIC_REQUIRED_COMPLETIONS = 28;

async function getBasicTrainingProgress(userId) {
  const quizScores = await QuizScores.findAll({
    where: {
      user_id: userId,
    },
    include: [
      {
        model: Modules,
        as: "module",
        attributes: [
          "categories",
          "training_type",
        ],
      },
    ],
  });

  const completed = quizScores.filter(
    (qs) =>
      qs.score >= 80 &&
      Array.isArray(qs.module?.categories) &&
      qs.module.categories.includes("basic")
  ).length;

  return {
    completed,
    total: BASIC_REQUIRED_COMPLETIONS,
    percent:
      BASIC_REQUIRED_COMPLETIONS > 0
        ? Number(
            (
              (completed / BASIC_REQUIRED_COMPLETIONS) *
              100
            ).toFixed(1)
          )
        : 0,
  };
}

module.exports = {
  getBasicTrainingProgress,
};