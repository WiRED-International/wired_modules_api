const {
  QuizScores,
  Modules,
  Specializations,
  ExamSessions,
  Exams,
  ExamTemplates,
} = require("../../models");
/**
 * Builds a normalized learning transcript for a learner.
 *
 * Currently includes:
 *   - Module quiz scores
 *
 * Future:
 *   - Exam sessions
 *   - ACT exams
 *   - Specialization exams
 *   - Practical assessments
 */

function normalizeCurriculum(module) {

  // Use the new training_type field when available.
  if (module.training_type) {

    switch (module.training_type.toLowerCase()) {

      case "basic":
        return "Basic Training";

      case "act":
        return "Advanced Community Health Worker Training";

      case "specialization":
        return "Specialization";

    }

  }

  // Fallback for existing modules that have not yet
  // been assigned a training_type.
  const curriculum =
    module.categories?.[0] ??
    module.credit_type ??
    "";

  switch (curriculum.toLowerCase()) {

    case "basic":
      return "Basic Training";

    case "cme":
      return "CME";

    case "act":
      return "Advanced Community Health Worker Training";

    default:
      return curriculum || "Unknown";

  }

}

async function buildLearnerTranscript(userId) {

  const quizScores = await QuizScores.findAll({

      where: {
          user_id: userId,
      },

      attributes: [
          "id",
          "score",
          "date_taken",
      ],

      include: [
        {
          model: Modules,
          as: "module",

          attributes: [
            "module_id",
            "name",
            "training_type",
            "categories",
            "credit_type",
          ],

          include: [
            {
              model: Specializations,
              as: "specializations",
              attributes: [
                "id",
                "name",
              ],
              through: {
                attributes: [],
              },
              required: false,
            },
          ],
        },
      ],

  });

  const transcript = quizScores.map((quiz) => ({

    recordId: `quiz-${quiz.id}`,

    displayId: quiz.module.module_id,

    title: quiz.module.name,

    type: "Module",

    training: normalizeCurriculum(quiz.module),

    specializations:
      quiz.module.specializations?.map((s) => s.name) || [],

    completedAt: quiz.date_taken,

    score: quiz.score,

    status: "Completed",

  }));

  const examSessions = await ExamSessions.findAll({

    where: {
      user_id: userId,
      active: false,
    },

    include: [
      {
        model: Exams,
        as: "exams",
        attributes: [
          "id",
          "title",
          "exam_template_id",
        ],
        include: [
          {
            model: ExamTemplates,
            as: "exam_template",
            attributes: [
              "program",
            ],
            required: false,
          },
        ],
      },
    ],

  });

  transcript.push(

    ...examSessions.map((session) => ({

      recordId: `exam-${session.id}`,

      displayId: `${session.exams.id}`,

      title: session.exams.title,

      type: "Exam",

      training: session.exams?.exam_template?.program || "Unknown",

      specializations: [],

      completedAt: session.submitted_at,

      score: session.score,

      status: "Completed",

    }))

  );

    transcript.sort(
      (a, b) =>
        new Date(b.completedAt).getTime() -
        new Date(a.completedAt).getTime()
    );

    return transcript;

}

module.exports = {
  buildLearnerTranscript,
};