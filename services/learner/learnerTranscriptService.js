const { Op } = require("sequelize");
const {
  QuizScores,
  Modules,
  Programs,
  Specializations,
  ExamSessions,
  Exams,
  ExamTemplates,
  Classes,
  ClassEnrollments,
  ClassEnrollmentSpecializations,
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

  // Prefer the module's current Program association.
  const program = module.programs?.[0];

  if (program?.name) {
    return program.name;
  }

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

function normalizeLegacyProgramName(program) {
  if (!program) {
    return "Unknown";
  }

  switch (program.toLowerCase()) {
    case "basic training":
      return "Basic CHW";

    case "act":
      return "Advanced CHW Training (ACT)";

    case "specialization":
      return "Specialization";

    default:
      return program;
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
              model: Programs,
              as: "programs",
              attributes: [
                "id",
                "name",
                "training_type",
              ],
              through: {
                attributes: [],
              },
              required: false,
            },
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
    attributes: [
      "id",
      "user_id",
      "class_id",
      "attempt_number",
      "submitted_at",
      "score",
    ],

    where: {
      user_id: userId,
      submitted_at: {
        [Op.ne]: null,
      },
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
      {
        model: Classes,
        as: "class",
        attributes: [
          "id",
          "name",
          "program_id",
        ],
        required: false,
        include: [
          {
            model: Programs,
            as: "program",
            attributes: [
              "id",
              "name",
              "training_type",
            ],
            required: false,
          },
          {
            model: ClassEnrollments,
            as: "class_enrollments",
            attributes: [
              "id",
              "user_id",
            ],
            where: {
              user_id: userId,
            },
            required: false,
            include: [
              {
                model: ClassEnrollmentSpecializations,
                as: "specialization_selection",
                attributes: [
                  "id",
                  "specialization_id",
                ],
                required: false,
                include: [
                  {
                    model: Specializations,
                    as: "specialization",
                    attributes: [
                      "id",
                      "name",
                    ],
                    required: false,
                  },
                ],
              },
            ],
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

      attemptNumber: session.attempt_number,

      training:
        session.class?.program?.name ||
        normalizeLegacyProgramName(
          session.exams?.exam_template?.program
        ),

      specializations:
        session.class?.class_enrollments?.[0]
          ?.specialization_selection
          ?.specialization
          ? [
              session.class.class_enrollments[0]
                .specialization_selection
                .specialization.name,
            ]
          : [],

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