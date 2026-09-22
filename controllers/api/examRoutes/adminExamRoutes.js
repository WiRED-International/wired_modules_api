const express = require('express');
const router = express.Router();
const {
  Exams,
  ExamSessions,
  ExamUserAccess,
  Users,
  ExamQuestions,
  Organizations,
  Classes,
  ClassEnrollments,
  Programs,
  AdminPermissions,
  ExamTemplates,
  ExamTemplateQuestions,
} = require('../../../models');
const auth = require("../../../middleware/auth");
const isAdmin = require('../../../middleware/isAdmin');
const ROLES = require('../../../utils/roles');
const { localToUtcISO, DEFAULT_EXAM_TIME_ZONE } = require("../../../utils/timezoneUtils");
const { Op } = require("sequelize");

/**
 * 📋 GET /api/admin/exams
 * List all exams with basic info (for admin dashboard)
 */
router.get('/', auth, isAdmin, async (req, res) => {
  try {
    const exams = await Exams.findAll({
      attributes: ['id', 'title', 'available_from', 'available_until', 'duration_minutes'],
      order: [['available_from', 'DESC']],
    });
    res.json(exams);
  } catch (err) {
    console.error('❌ Failed to load exams:', err);
    res.status(500).json({ message: 'Failed to load exams' });
  }
});

/**
 * 📊 GET /api/admin/exams/kpis
 * KPI metrics for exam dashboard
 */
router.get('/kpis', auth, isAdmin, async (req, res) => {

  try {

    const {
      examId,
      orgId,
      programId,
      classId,
      dateFrom,
      dateTo,
      status,
    } = req.query;

    // -------------------------------
    // FILTERING
    // -------------------------------

    const classWhere = {};

    if (classId) {
      classWhere.id = Number(classId);
    }

    if (programId) {
      classWhere.program_id = Number(programId);
    }

    const sessionWhere = {};

    if (examId) {
      sessionWhere.exam_id = examId;
    }

    // For new sessions, the stored class_id is authoritative.
    // NULL is allowed so historical sessions can still use
    // the legacy class/enrollment relationships below.
    if (classId) {
      sessionWhere[Op.or] = [
        { class_id: Number(classId) },
        { class_id: null },
      ];
    }

    if (dateFrom || dateTo) {

      sessionWhere.submitted_at = {};

      if (dateFrom) {
        sessionWhere.submitted_at[Op.gte] =
          new Date(dateFrom);
      }

      if (dateTo) {
        sessionWhere.submitted_at[Op.lte] =
          new Date(dateTo);
      }

    }

    // STATUS FILTER

    if (status === "passed") {
      sessionWhere.score = {
        [Op.gte]: 80
      };
    }

    if (status === "failed") {
      sessionWhere.score = {
        [Op.and]: [
          { [Op.ne]: null },
          { [Op.lt]: 80 }
        ]
      };
    }

    if (status === "in-progress") {
      sessionWhere.score = null;
    }

    // -------------------------------
    // ADMIN VISIBILITY
    // -------------------------------

    const userIncludeWhere = {};

    const currentUser =
      req.user;

    if (orgId) {

      userIncludeWhere.organization_id =
        orgId;

    } else if (
      currentUser.role_id === 2
    ) {

      const perms =
        await AdminPermissions.findAll({
          where: {
            admin_id:
              currentUser.id
          }
        });

      const orgIds =
        perms
          .map(
            p => p.organization_id
          )
          .filter(
            id => id != null
          );

      if (orgIds.length === 0) {

        return res.json({
          totalAttempts: 0,
          averageScore: 0,
          passRate: 0,
          activeExams: 0,
        });

      }

      userIncludeWhere.organization_id = {
        [Op.in]: orgIds
      };

    }

    // -------------------------------
    // LOAD MATCHING SESSIONS
    // -------------------------------

    const sessions =
      await ExamSessions.findAll({

        where:
          sessionWhere,

        include: [
          {
            model: Exams,
            as: 'exams',
            attributes: ['id'],

            required:
              Object.keys(classWhere).length > 0,

            include: [
              {
                model: Classes,
                as: 'classes',
                attributes: ['id'],
                through: {
                  attributes: [],
                },

                ...(Object.keys(classWhere).length > 0
                  ? {
                      where: classWhere,
                      required: true,
                    }
                  : {
                      required: false,
                    }),
              },
            ],
          },

          {
            model: Users,
            as: 'users',
            attributes: [
              'organization_id'
            ],

            include: [
              ...((classId || programId)
                ? [
                    {
                      model: ClassEnrollments,
                      as: 'class_enrollments',
                      attributes: [],
                      where: {
                        status: 'enrolled',

                        ...(classId
                          ? {
                              class_id:
                                Number(classId)
                            }
                          : {}),
                      },

                      required: true,

                      ...(programId
                        ? {
                            include: [
                              {
                                model: Classes,
                                as: 'class',
                                attributes: [],
                                where: {
                                  program_id:
                                    Number(programId),
                                },
                                required: true,
                              },
                            ],
                          }
                        : {}),
                    },
                  ]
                : []),
            ],

            ...(Object.keys(userIncludeWhere).length > 0
              ? {
                  where: userIncludeWhere
                }
              : {}),

            required: Boolean(
              orgId ||
              classId ||
              programId ||
              Object.keys(userIncludeWhere).length > 0
            ),
          },
        ]

      });

    // -------------------------------
    // KPI CALCULATIONS
    // -------------------------------

    const totalAttempts =
      sessions.length;

    const completedSessions =
      sessions.filter(
        s => s.score !== null
      );

    const averageScore =
      completedSessions.length > 0
        ? (
            completedSessions.reduce(
              (sum, s) =>
                sum + Number(s.score),
              0
            ) /
            completedSessions.length
          ).toFixed(1)
        : 0;

    const passedCount =
      completedSessions.filter(
        s => Number(s.score) >= 80
      ).length;

    const passRate =
      completedSessions.length > 0
        ? (
            passedCount /
            completedSessions.length
          ) * 100
        : 0;

    const activeExams =
      sessions.filter(
        s =>
          s.active === true &&
          s.score === null
      ).length;

    res.json({

      totalAttempts,

      averageScore:
        Number(averageScore),

      passRate:
        Number(
          passRate.toFixed(1)
        ),

      activeExams,

    });

  } catch (err) {

    console.error(
      '❌ Failed to load KPI metrics:',
      err
    );

    res.status(500).json({
      message:
        'Failed to load KPI metrics'
    });

  }

});

/**
 * 📈 GET /api/admin/exams/analytics
 * Analytics data for exam dashboard charts
 */
router.get('/analytics', auth, isAdmin, async (req, res) => {
  try {
    const {
      examId,
      orgId,
      programId,
      classId,
      dateFrom,
      dateTo,
      status,
    } = req.query;

    const classWhere = {};

    if (classId) {
      classWhere.id = Number(classId);
    }

    if (programId) {
      classWhere.program_id = Number(programId);
    }

    const sessionWhere = {};

    if (examId) {
      sessionWhere.exam_id = examId;
    }

    // For new sessions, the stored class_id is authoritative.
    // NULL is allowed so historical sessions can still use
    // the legacy class/enrollment relationships below.
    if (classId) {
      sessionWhere[Op.or] = [
        { class_id: Number(classId) },
        { class_id: null },
      ];
    }

    if (dateFrom || dateTo) {
      sessionWhere.submitted_at = {};

      if (dateFrom) {
        sessionWhere.submitted_at[Op.gte] = new Date(dateFrom);
      }

      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        sessionWhere.submitted_at[Op.lte] = endDate;
      }
    }

    if (status === "passed") {
      sessionWhere.score = { [Op.gte]: 80 };
    }

    if (status === "failed") {
      sessionWhere.score = {
        [Op.and]: [
          { [Op.ne]: null },
          { [Op.lt]: 80 },
        ],
      };
    }

    if (status === "in-progress") {
      sessionWhere.score = null;
    }

    const userIncludeWhere = {};
    const currentUser = req.user;

    if (orgId) {
      userIncludeWhere.organization_id = orgId;
    } else if (currentUser.role_id === 2) {
      const perms = await AdminPermissions.findAll({
        where: { admin_id: currentUser.id },
      });

      const orgIds = perms
        .map(p => p.organization_id)
        .filter(id => id != null);

      if (orgIds.length === 0) {
        return res.json({
          distribution: {
            excellent: 0,
            good: 0,
            needsImprovement: 0,
            totalCompleted: 0,
          },
        });
      }

      userIncludeWhere.organization_id = {
        [Op.in]: orgIds,
      };
    }

    const sessions = await ExamSessions.findAll({
      where: sessionWhere,

      attributes: [
        'id',
        'exam_id',
        'score',
        'answers'
      ],

      include: [
        {
          model: Exams,
          as: 'exams',
          attributes: ['id'],

          required:
            Object.keys(classWhere).length > 0,

          include: [
            {
              model: Classes,
              as: 'classes',
              attributes: ['id'],
              through: {
                attributes: [],
              },

              ...(Object.keys(classWhere).length > 0
                ? {
                    where: classWhere,
                    required: true,
                  }
                : {
                    required: false,
                  }),
            },
          ],
        },

        {
          model: Users,
          as: 'users',
          attributes: ['organization_id'],

          include: [
            ...((classId || programId)
              ? [
                  {
                    model: ClassEnrollments,
                    as: 'class_enrollments',
                    attributes: [],

                    where: {
                      status: 'enrolled',

                      ...(classId
                        ? {
                            class_id: Number(classId),
                          }
                        : {}),
                    },

                    required: true,

                    ...(programId
                      ? {
                          include: [
                            {
                              model: Classes,
                              as: 'class',
                              attributes: [],
                              where: {
                                program_id: Number(programId),
                              },
                              required: true,
                            },
                          ],
                        }
                      : {}),
                  },
                ]
              : []),
          ],

          ...(Object.keys(userIncludeWhere).length > 0
            ? {
                where: userIncludeWhere,
              }
            : {}),

          required: Boolean(
            orgId ||
            classId ||
            programId ||
            Object.keys(userIncludeWhere).length > 0
          ),
        },
      ],
    });

    const completedSessions = sessions.filter(
      s => s.score !== null
    );

    const questionStats = {};

    for (const session of completedSessions) {

      const exam = await Exams.findByPk(
        session.exam_id,
        {
          attributes: [
            'id',
            'title',
            'exam_template_id'
          ]
        }
      );
      const sessionExamTitle = exam?.title || "Unknown Exam";

      let questions = [];

      if (exam?.exam_template_id) {

        questions =
          await ExamTemplateQuestions.findAll({
            where: {
              exam_template_id:
                exam.exam_template_id
            },
            attributes: [
              'id',
              'question_text',
              'correct_answers'
            ]
          });

      } else {

        questions =
          await ExamQuestions.findAll({
            where: {
              exam_id: session.exam_id
            },
            attributes: [
              'id',
              'question_text',
              'correct_answers'
            ]
          });

      }

      const answerMap = {};

      (session.answers || []).forEach(
        answer => {
          answerMap[
            answer.question_id
          ] = answer;
        }
      );

      for (const question of questions) {

        const userAnswer =
          answerMap[question.id];

        if (!userAnswer) {
          continue;
        }

        const selected =
          userAnswer.selected_option_ids || [];

        const correct =
          question.correct_answers || [];

        const isCorrect =
          selected.length === correct.length &&
          selected.every(
            id => correct.includes(id)
          );

        if (!questionStats[question.id]) {

          questionStats[question.id] = {
            questionId: question.id,
            examId: session.exam_id,
            examTitle: sessionExamTitle,
            questionText: question.question_text,
            missedCount: 0,
            attemptCount: 0,
          };

        }

        questionStats[question.id]
          .attemptCount++;

        if (!isCorrect) {

          questionStats[question.id]
            .missedCount++;

        }

      }

    }

    const mostMissedQuestions =
      Object.values(questionStats)
        .map(q => {

          const missRate =
            q.attemptCount > 0
              ? Number(
                  (
                    q.missedCount /
                    q.attemptCount *
                    100
                  ).toFixed(1)
                )
              : 0;

          const difficultyScore =
            missRate *
            Math.log10(
              q.attemptCount + 1
            );

          return {
            ...q,
            missRate,
            difficultyScore,
          };

        })
        .sort(
          (a, b) =>
            b.difficultyScore -
            a.difficultyScore
        )
        .slice(0, 5);

    const excellent = completedSessions.filter(
      s => Number(s.score) >= 90
    ).length;

    const good = completedSessions.filter(
      s =>
        Number(s.score) >= 80 &&
        Number(s.score) < 90
    ).length;

    const needsImprovement = completedSessions.filter(
      s => Number(s.score) < 80
    ).length;

    console.log(
      mostMissedQuestions.map(q => ({
        questionId: q.questionId,
        missRate: q.missRate,
        attempts: q.attemptCount,
        difficultyScore: q.difficultyScore,
      }))
    );
    res.json({
      distribution: {
        excellent,
        good,
        needsImprovement,
        totalCompleted:
          completedSessions.length,
      },

      mostMissedQuestions,
    });

  } catch (err) {
    console.error('❌ Failed to load exam analytics:', err);

    res.status(500).json({
      message: 'Failed to load exam analytics',
    });
  }
});

/**
 * 📊 GET /api/admin/exams/question-analytics/:questionId
 * Answer distribution for a single question
 */
router.get('/question-analytics/:questionId', auth, isAdmin, async (req, res) => {
    const { questionId } = req.params;
    console.log("questionId:", questionId);
    let question =
      await ExamTemplateQuestions.findByPk(
        questionId
      );

    if (!question) {
      question =
        await ExamQuestions.findByPk(
          questionId
        );
    }
    console.log(
      "Template Question:",
      question
    );
    if (!question) {
      return res.status(404).json({
        message: "Question not found"
      });
    }
    let examTitle = "Unknown Exam";
    if (question.exam_template_id) {

      const exam =
        await Exams.findOne({
          where: {
            exam_template_id:
              question.exam_template_id
          },
          attributes: [
            'title'
          ]
        });

      if (exam) {
        examTitle =
          exam.title;
      }

    } else if (question.exam_id) {

      const exam =
        await Exams.findByPk(
          question.exam_id,
          {
            attributes: [
              'title'
            ]
          }
        );

      if (exam) {
        examTitle =
          exam.title;
      }

    }

    
    const sessions =
      await ExamSessions.findAll({
        where: {
          score: {
            [Op.ne]: null
          }
        }
      });
    const optionCounts = {};
    Object.keys(question.options)
      .forEach(key => {
        optionCounts[key] = 0;
      });
    for (const session of sessions) {

      const answers =
        session.answers || [];

      const answer =
        answers.find(
          a =>
            a.question_id ===
            question.id
        );

      if (!answer) {
        continue;
      }

      const selected =
        answer.selected_option_ids || [];

      selected.forEach(id => {

        if (
          optionCounts[id] !==
          undefined
        ) {
          optionCounts[id]++;
        }

      });

    }
    const totalSelections =
      Object.values(optionCounts)
        .reduce(
          (sum, count) =>
            sum + count,
          0
        );
    const distribution = Object.entries(question.options).map(([optionId, optionText]) => ({
      optionId,
      optionText,
      count: optionCounts[optionId],
      percent:
        totalSelections > 0
          ? Number(
              (
                optionCounts[optionId] /
                totalSelections *
                100
              ).toFixed(1)
            )
          : 0,

      isCorrect:
        (question.correct_answers || [])
          .includes(optionId),

    }));
    res.json({
      questionId: question.id,

      questionText:
        question.question_text,

      examTitle,

      attemptCount:
        totalSelections,

      distribution,
    });
  }
);

// 🧠 Add questions to an existing exam (the :id is exam id)
router.post('/:id/questions', auth, isAdmin, async (req, res) => {
  const { id } = req.params;
  const { questions } = req.body;

  try {
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: 'Questions array is required' });
    }

    // 🧩 Normalize & validate data for each question
    console.log('🧭 Route params:', req.params);
    const formattedQuestions = questions.map((q, index) => {
      // Ensure correct_answers is always an array
      let correctAnswers = [];
      if (Array.isArray(q.correct_answers)) {
        correctAnswers = q.correct_answers;
      } else if (Array.isArray(q.correct_answer)) {
        correctAnswers = q.correct_answer;
      } else if (typeof q.correct_answers === 'string') {
        // handle accidentally stringified JSON
        try {
          correctAnswers = JSON.parse(q.correct_answers);
        } catch {
          correctAnswers = [];
        }
      }

      return {
        exam_id: id,
        question_type: q.question_type || 'single',
        question_text: q.question_text?.trim(),
        options: q.options || {},
        correct_answers: correctAnswers, // ✅ always stored as array
        order: q.order ?? index + 1, // fallback order if missing
        created_at: new Date(),
        updated_at: new Date(),
      };
    });

    // 🧠 Validate required fields
    for (const fq of formattedQuestions) {
      if (!fq.question_text || !Object.keys(fq.options).length) {
        return res.status(400).json({
          message: 'Each question must include both question_text and at least one option',
        });
      }
      if (!Array.isArray(fq.correct_answers)) {
        return res.status(400).json({
          message: 'correct_answers must be an array',
        });
      }
    }

    // 🧮 Bulk insert all questions at once
    console.log('🧪 First formatted question:', formattedQuestions[0]);
    const created = await ExamQuestions.bulkCreate(formattedQuestions);

    res.status(201).json({
      message: '✅ Questions added successfully',
      count: created.length,
    });
  } catch (error) {
    console.error('❌ Failed to add questions:', error);
    res.status(500).json({
      message: 'Failed to add questions',
      error: error.message,
    });
  }
});

// 🔁 PUT /admin/exams/:id/questions
// Updates existing questions (with `id`) and adds new ones (without `id`)
router.put('/:id/questions', auth, isAdmin, async (req, res) => {
  const { id } = req.params; // exam_id
  const { questions } = req.body;

  try {
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: 'Questions array is required' });
    }

    const updates = [];
    const newQuestions = [];

    for (const [index, q] of questions.entries()) {
      // Normalize correct_answers input
      let correctAnswers = [];
      if (Array.isArray(q.correct_answers)) {
        correctAnswers = q.correct_answers;
      } else if (typeof q.correct_answers === 'string') {
        try {
          correctAnswers = JSON.parse(q.correct_answers);
        } catch {
          correctAnswers = [];
        }
      }

      // ✅ Case 1: Update existing (has ID)
      if (q.id) {
        const question = await ExamQuestions.findOne({
          where: { id: q.id, exam_id: id },
        });

        if (!question) {
          console.warn(`⚠️ Question ID ${q.id} not found for exam ${id}, skipping update.`);
          continue;
        }

        await question.update({
          question_type: q.question_type ?? question.question_type,
          question_text: q.question_text?.trim() ?? question.question_text,
          options: q.options ?? question.options,
          correct_answers:
            correctAnswers.length > 0 ? correctAnswers : question.correct_answers,
          order: q.order ?? question.order,
          updated_at: new Date(),
        });

        updates.push(question);
      }

      // ✅ Case 2: Add new (no ID)
      else {
        if (!q.question_text || !q.options) {
          console.warn(`⚠️ Skipping question at index ${index}: missing question_text or options.`);
          continue;
        }

        const newQ = {
          exam_id: Number(id),
          question_type: q.question_type || 'single',
          question_text: q.question_text.trim(),
          options: q.options,
          correct_answers: correctAnswers,
          order: q.order ?? index + 1,
          created_at: new Date(),
          updated_at: new Date(),
        };
        newQuestions.push(newQ);
      }
    }

    // 🧮 Bulk insert new questions if any
    let created = [];
    if (newQuestions.length > 0) {
      created = await ExamQuestions.bulkCreate(newQuestions);
      console.log(`🆕 Added ${created.length} new questions`);
    }

    res.status(200).json({
      message: `✅ Successfully updated ${updates.length} and added ${created.length} question(s).`,
      updatedCount: updates.length,
      addedCount: created.length,
    });
  } catch (error) {
    console.error('❌ Failed to update/add questions:', error);
    res.status(500).json({
      message: 'Failed to update/add exam questions',
      error: error.message,
    });
  }
});

// 📋 GET /admin/exams/:id/questions - Fetch all questions for a given exam
router.get('/:id/questions', auth, isAdmin, async (req, res) => {
  const { id } = req.params;
  const includeAnswers = req.query.includeAnswers === 'true';
  const userRole = req.user?.roleId;

  try {

    const exam = await Exams.findByPk(id);

    if (!exam) {
      return res.status(404).json({
        message: `Exam ID ${id} not found`
      });
    }

    const canViewAnswers =
      includeAnswers && (userRole === 2 || userRole === 3);

    let questions = [];

    // ✅ NEW TEMPLATE-BASED LOGIC
    if (exam.exam_template_id) {

      questions = await ExamTemplateQuestions.findAll({
        where: {
          exam_template_id: exam.exam_template_id
        },
        order: [['order', 'ASC']],
        attributes: canViewAnswers
          ? undefined
          : { exclude: ['correct_answers'] },
      });

    }

    // ✅ FALLBACK FOR LEGACY EXAMS
    else {

      questions = await ExamQuestions.findAll({
        where: { exam_id: id },
        order: [['order', 'ASC']],
        attributes: canViewAnswers
          ? undefined
          : { exclude: ['correct_answers'] },
      });

    }

    if (!questions || questions.length === 0) {
      return res.status(404).json({
        message: `No questions found for exam ID ${id}`
      });
    }

    res.status(200).json({
      message: `✅ Retrieved ${questions.length} question(s) for exam ${id}`,
      count: questions.length,
      includeAnswers: canViewAnswers,
      using_template: !!exam.exam_template_id,
      questions,
    });

  } catch (error) {

    console.error('❌ Failed to fetch questions:', error);

    res.status(500).json({
      message: 'Failed to fetch exam questions',
      error: error.message,
    });
  }
});

/**
 * 🧩 POST /api/admin/exams
 * Create a new exam
 */
router.post('/', auth, isAdmin, async (req, res) => {
  try {
    const {
      title,
      description,
      localStart,
      localEnd,
      timeZone,
      duration_minutes,
      exam_template_id
    } = req.body;

    if (!localStart || !localEnd) {
      return res.status(400).json({
        message: "localStart and localEnd are required (local date/time)"
      });
    }

    // Use provided timezone or default
    const zone = timeZone || DEFAULT_EXAM_TIME_ZONE;

    // Convert local times to UTC ISO
    const startUTC = localToUtcISO(localStart, zone);
    const endUTC = localToUtcISO(localEnd, zone);

    const exam = await Exams.create({
      title,
      description,
      available_from: startUTC,
      available_until: endUTC,
      duration_minutes,
      time_zone: zone,
      exam_template_id: exam_template_id || null
    });

    res.status(201).json({
      message: "Exam created successfully (UTC normalized).",
      savedUTC: {
        available_from: startUTC,
        available_until: endUTC
      },
      exam
    });

  } catch (err) {
    console.error('❌ Failed to create exam:', err);
    res.status(500).json({
      message: 'Failed to create exam',
      error: err.message
    });
  }
});

/**
 * 🧾 POST /api/admin/exams/:id/assign
 * Assign specific users to an exam (creates ExamUserAccess records)
 */
router.post('/:examId/assign', auth, isAdmin, async (req, res) => {
  const { examId } = req.params;
  const { user_ids, max_attempts } = req.body;

  // 🔹 Basic validation
  if (!Array.isArray(user_ids) || user_ids.length === 0) {
    return res.status(400).json({ message: 'No user IDs provided.' });
  }

  try {
    // ✅ Verify that the exam exists (optional but good practice)
    const exam = await Exams.findByPk(examId);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found.' });
    }

    // ✅ Create ExamUserAccess entries
    const records = await Promise.all(
      user_ids.map(async (user_id) => {

        const exists =
          await ExamUserAccess.findOne({
            where: {
              exam_id: examId,
              user_id
            }
          });

        if (exists) {
          return null;
        }

        return ExamUserAccess.create({
          exam_id: examId,
          user_id,
          max_attempts: max_attempts ?? 1,
          granted_by: req.user.id,
        });

      })
    );

    const createdRecords = records.filter(Boolean);

    res.status(201).json({
      message: `Access granted successfully to ${createdRecords.length} user(s).`,
      records: createdRecords,
    });
  } catch (err) {
    console.error('❌ Failed to assign users:', err);
    res.status(500).json({
      message: 'Failed to assign users',
      error: err.message,
    });
  }
});

/**
 * 🔁 PUT /api/admin/exams/:examId/grant-attempt/:userId
 * Grant an additional attempt to a specific user
 */
router.put('/:examId/grant-attempt/:userId', auth, isAdmin, async (req, res) => {
  const { examId, userId } = req.params;
  const { reason } = req.body;

  try {
    const access = await ExamUserAccess.findOne({
      where: { exam_id: examId, user_id: userId },
    });

    if (!access)
      return res.status(404).json({ message: 'Access record not found.' });

    access.max_attempts = (access.max_attempts || 0) + 1;
    access.reason = reason || 'Extra attempt granted by admin';
    await access.save();

    res.json({
      message: 'Extra attempt granted successfully.',
      access,
    });
  } catch (err) {
    console.error('❌ Error granting attempt:', err);
    res.status(500).json({ message: 'Error granting attempt.', error: err.message });
  }
});

/**
 * 📊 GET /api/admin/exams/results
 * All exam sessions (all exams + all orgs) with optional filters + pagination.
 * - Super Admin: sees everything
 * - Admin: only orgs in admin_permissions (visibility B)
 */
router.get('/results', auth, isAdmin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      examId,
      orgId,
      programId,
      classId,
      dateFrom,
      dateTo,
      status,
      sortBy,
      sortOrder,
    } = req.query;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const perPage = Math.max(parseInt(limit, 10) || 50, 1);
    const offset = (pageNum - 1) * perPage;

    // -------------------------------
    // SORTING SETUP
    // -------------------------------
    const ALLOWED_SORT_FIELDS = {
      first_name: ['users', 'first_name'],
      last_name: ['users', 'last_name'],
      email: ['users', 'email'],
      exam_title: ['exams', 'title'],
      score: ['score'],
      submitted_at: ['submitted_at'],
      organization: ['users->organization', 'name'],
    };

    // Default sort
    const sortFieldKey = sortBy || "submitted_at";
    const sortDirection = sortOrder?.toUpperCase() === "ASC" ? "ASC" : "DESC";

    let order = [];

    if (ALLOWED_SORT_FIELDS[sortFieldKey]) {
      const mapping = ALLOWED_SORT_FIELDS[sortFieldKey];

      if (mapping.length === 1) {
        // score OR submitted_at
        order.push([mapping[0], sortDirection]);

      } else if (mapping.length === 2) {
        // Nested (users, organization, exams)
        const [assoc, col] = mapping;
        const parts = assoc.split("->");

        if (parts.length === 1) {
          order.push([{ model: Users, as: parts[0] }, col, sortDirection]);

        } else if (parts.length === 2) {
          order.push([
            {
              model: Users,
              as: parts[0],
              include: [
                { model: Organizations, as: parts[1] }
              ]
            },
            col,
            sortDirection
          ]);
        }
      }

    } else {
      // Fallback sort
      order.push(["submitted_at", "DESC"]);
    }

    // -------------------------------
    // FILTERING
    // -------------------------------
    const classWhere = {};

    if (classId) {
      classWhere.id = Number(classId);
    }

    if (programId) {
      classWhere.program_id = Number(programId);
    }

    const sessionWhere = {};

    if (examId) sessionWhere.exam_id = examId;

    // For new sessions, the stored class_id is authoritative.
    // Historical sessions with class_id = NULL are still allowed
    // through so the legacy class fallback can evaluate them.
    if (classId) {
      sessionWhere[Op.or] = [
        {
          class_id: Number(classId),
        },
        {
          class_id: null,
        },
      ];
    }

    if (dateFrom || dateTo) {
      sessionWhere.submitted_at = {};
      if (dateFrom) sessionWhere.submitted_at[Op.gte] = new Date(dateFrom);
      if (dateTo)   sessionWhere.submitted_at[Op.lte] = new Date(dateTo);
    }

    // STATUS FILTER
    if (status === "passed") {
      sessionWhere.score = { [Op.gte]: 80 };
    }

    if (status === "failed") {
      sessionWhere.score = {
        [Op.and]: [
          { [Op.ne]: null },
          { [Op.lt]: 80 }
        ]
      };
    }

    if (status === "in-progress") {
      sessionWhere.score = null;
    }

    // -------------------------------
    // ADMIN VISIBILITY — ORG FILTERS
    // -------------------------------
    const userIncludeWhere = {};
    const currentUser = req.user;

    if (orgId) {
      userIncludeWhere.organization_id = orgId;

    } else if (currentUser.role_id === 2) {
      // Admin must be restricted by admin_permissions
      const perms = await AdminPermissions.findAll({
        where: { admin_id: currentUser.id },
      });

      const orgIds = perms
        .map(p => p.organization_id)
        .filter(id => id != null);

      if (orgIds.length === 0) {
        return res.json({
          page: pageNum,
          limit: perPage,
          total: 0,
          totalPages: 0,
          results: [],
        });
      }

      userIncludeWhere.organization_id = { [Op.in]: orgIds };
    }

    // -------------------------------
    // INCLUDE MODELS
    // -------------------------------
    const include = [
      {
        model: Classes,
        as: 'class',
        attributes: [
          'id',
          'name',
          'organization_id',
          'program_id',
        ],
        required: false,

        include: [
          {
            model: Programs,
            as: 'program',
            attributes: [
              'id',
              'name',
              'training_type',
            ],
            required: false,
          },
        ],
      },
      {
        model: Exams,
        as: 'exams',
        attributes: ['id', 'title'],
        required:
          Object.keys(classWhere).length > 0,
        include: [
          {
            model: Classes,
            as: 'classes',
            attributes: [
              'id',
              'name',
              'organization_id',
              'program_id',
            ],
            through: {
              attributes: [],
            },

            include: [
              {
                model: Programs,
                as: 'program',
                attributes: [
                  'id',
                  'name',
                  'training_type',
                ],
              },
            ],

            ...(Object.keys(classWhere).length > 0
              ? {
                  where: classWhere,
                  required: true,
                }
              : {
                  required: false,
                }),
          },
        ],
      },
      {
        model: Users,
        as: 'users',
        attributes: [
          'id',
          'first_name',
          'last_name',
          'email',
          'organization_id'
        ],

        include: [
          {
            model: Organizations,
            as: 'organization',
            attributes: ['id', 'name'],
          },

          ...((classId || programId)
            ? [
                {
                  model: ClassEnrollments,
                  as: 'class_enrollments',
                  attributes: [],
                  where: {
                    status: 'enrolled',
                    ...(classId
                      ? { class_id: Number(classId) }
                      : {}),
                  },
                  required: true,

                  ...(programId
                    ? {
                        include: [
                          {
                            model: Classes,
                            as: 'class',
                            attributes: [],
                            where: {
                              program_id: Number(programId),
                            },
                            required: true,
                          },
                        ],
                      }
                    : {}),
                },
              ]
            : []),
        ],

        ...(Object.keys(userIncludeWhere).length > 0
          ? { where: userIncludeWhere }
          : {}),

        required: Boolean(
          orgId ||
          classId ||
          programId ||
          Object.keys(userIncludeWhere).length > 0
        ),
      },
    ];

    // -------------------------------
    // MAIN QUERY
    // -------------------------------
    const { count, rows } = await ExamSessions.findAndCountAll({
      where: sessionWhere,
      include,
      order,
      limit: perPage,
      offset,
      distinct: true,
    });

    const totalPages = Math.ceil(count / perPage) || 1;

    const results = rows.map(s => {
      const exam = s.exams;
      const user = s.users;
      const org = user?.organization;

      // New sessions store their actual class directly.
      // Historical sessions may have class_id = NULL, so
      // fall back to the exam's assigned classes.
      const sessionClass = s.class || null;

      const fallbackClass =
        !sessionClass
          ? (
              exam?.classes?.find(classItem => {

                if (classId) {
                  return classItem.id === Number(classId);
                }

                if (programId) {
                  return classItem.program_id === Number(programId);
                }

                return true;
              }) || null
            )
          : null;

      const matchedClass =
        sessionClass || fallbackClass;

      const program =
        matchedClass?.program || null;

      return {
        session_id: s.id,
        exam_id: s.exam_id,
        exam_title: exam ? exam.title : null,

        organization_id:
          user ? user.organization_id : null,

        organization_name:
          org ? org.name : null,

        class_id:
          matchedClass ? matchedClass.id : null,

        class_name:
          matchedClass ? matchedClass.name : null,

        program_id:
          program ? program.id : null,

        program_name:
          program ? program.name : null,

        attempt_number: s.attempt_number,
        score: s.score,
        submitted_at: s.submitted_at,
        active: s.active,

        user: {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
        },
      };
    });

    res.json({
      page: pageNum,
      limit: perPage,
      total: count,
      totalPages,
      results,
    });
  } catch (err) {
    console.error('❌ Failed to load exam results:', err);
    res.status(500).json({ message: 'Failed to load exam results' });
  }
});


/**
 * 🧐 GET /api/admin/exams/sessions/:sessionId/details
 * View detailed answers + grading info for a single exam session
 */
router.get('/sessions/:sessionId/details', auth, isAdmin, async (req, res) => {
  const { sessionId } = req.params;
  let questions = [];

  try {
    const session = await ExamSessions.findByPk(sessionId, {
      include: [
        {
          model: Users,
          as: 'users',
          attributes: [
            'id',
            'first_name',
            'last_name',
            'email'
          ],
          include: [
            {
              model: Organizations,
              as: 'organization',
              attributes: [
                'id',
                'name'
              ]
            }
          ]
        },
        {
          model: Exams,
          as: 'exams'
        },
        {
          model: Classes,
          as: 'class',
          attributes: [
            'id',
            'name',
            'organization_id',
            'program_id'
          ],
          required: false,
          include: [
            {
              model: Programs,
              as: 'program',
              attributes: [
                'id',
                'name',
                'training_type'
              ],
              required: false
            }
          ]
        },
      ],
    });

    if (!session)
      return res.status(404).json({ message: 'Exam session not found' });

    if (session.exams?.exam_template_id) {

      questions = await ExamTemplateQuestions.findAll({
        where: {
          exam_template_id: session.exams.exam_template_id
        },
        attributes: [
          'id',
          'question_text',
          'options',
          'correct_answers'
        ],
        order: [['order', 'ASC']],
      });

    } else {

      questions = await ExamQuestions.findAll({
        where: {
          exam_id: session.exam_id
        },
        attributes: [
          'id',
          'question_text',
          'options',
          'correct_answers'
        ],
        order: [['id', 'ASC']],
      });

    }
    const answerMap = {};

    (session.answers || []).forEach(answer => {
      answerMap[answer.question_id] = answer;
    });
    const combined = questions.map(q => {

      const userAnswer =
        answerMap[q.id] || null;

      const selected =
        userAnswer?.selected_option_ids || [];

      const correct =
        q.correct_answers || [];

      const isCorrect =
        selected.length === correct.length &&
        selected.every(id => correct.includes(id));

      return {
        question_id: q.id,
        question_text: q.question_text,
        options: q.options,
        correct_answers: q.correct_answers,
        user_answer: userAnswer,
        is_correct: isCorrect,
      };

    });

    res.json({
      user: session.users,
      organization: session.users.organization?.name || null,

      class: session.class
        ? {
            id: session.class.id,
            name: session.class.name,
          }
        : null,

      program: session.class?.program
        ? {
            id: session.class.program.id,
            name: session.class.program.name,
            training_type: session.class.program.training_type,
          }
        : null,

      exam: session.exams,
      score: session.score,
      submitted_at: session.submitted_at,
      attempt_number: session.attempt_number,
      questions: combined,
    });
  } catch (err) {
    console.error('❌ Failed to load exam session details:', err);
    res.status(500).json({ message: 'Failed to load exam session details' });
  }
});

/**
 * 📚 GET /api/admin/exams/historical-unassigned/:userId
 * Super Admin only.
 * Returns submitted exam sessions for a student
 * that have not yet been associated with a class.
 */
router.get(
  '/historical-unassigned/:userId',
  auth,
  isAdmin,
  async (req, res) => {

    try {

      // Super Admin only.
      if (req.user.roleId !== ROLES.SUPER_ADMIN) {
        return res.status(403).json({
          message:
            'Only a Super Admin can manage historical exam assignments.',
        });
      }

      const { userId } = req.params;

      const user =
        await Users.findByPk(
          userId,
          {
            attributes: [
              'id',
              'wired_user_id',
              'first_name',
              'last_name',
              'email',
              'organization_id',
            ],
          }
        );

      if (!user) {
        return res.status(404).json({
          message:
            'Student not found.',
        });
      }

      const sessions =
        await ExamSessions.findAll({
          where: {
            user_id: user.id,
            submitted_at: {
              [Op.ne]: null,
            },
          },

          attributes: [
            'id',
            'exam_id',
            'class_id',
            'attempt_number',
            'score',
            'submitted_at',
          ],

          include: [
            {
              model: Exams,
              as: 'exams',
              attributes: [
                'id',
                'title',
                'exam_template_id',
              ],
            },
          ],

          order: [
            ['submitted_at', 'DESC'],
          ],
        });

      return res.status(200).json({
        user: {
          id: user.id,
          wired_user_id:
            user.wired_user_id,
          first_name:
            user.first_name,
          last_name:
            user.last_name,
          email:
            user.email,
          organization_id:
            user.organization_id,
        },

        sessions: sessions.map(
          (session) => ({
            id:
              session.id,

            exam_id:
              session.exam_id,

            exam_title:
              session.exams?.title ?? null,

            exam_template_id:
              session.exams?.exam_template_id ?? null,

            class_id:
              session.class_id,

            attempt_number:
              session.attempt_number,

            score:
              session.score,

            submitted_at:
              session.submitted_at,
          })
        ),
      });

    } catch (err) {

      console.error(
        '❌ Failed to load unassigned historical exam sessions:',
        err
      );

      return res.status(500).json({
        message:
          'Failed to load unassigned historical exam sessions.',
      });

    }

  }
);

/**
 * 🗂 POST /api/admin/exams/historical-assign
 * Super Admin only.
 *
 * Associates an existing submitted historical exam session
 * with a class and ensures the exam itself is assigned
 * to that class.
 */
router.post(
  '/historical-assign',
  auth,
  isAdmin,
  async (req, res) => {

    try {

      if (req.user.roleId !== ROLES.SUPER_ADMIN) {
        return res.status(403).json({
          message:
            'Only a Super Admin can manage historical exam assignments.',
        });
      }

      const {
        sessionId,
        classId,
      } = req.body;

      if (!sessionId || !classId) {
        return res.status(400).json({
          message:
            'sessionId and classId are required.',
        });
      }

      // Find the historical exam session.
      const session =
        await ExamSessions.findByPk(
          sessionId
        );

      if (!session) {
        return res.status(404).json({
          message:
            'Exam session not found.',
        });
      }

      // Historical reconciliation is only for
      // completed/submitted exam sessions.
      if (!session.submitted_at) {
        return res.status(400).json({
          message:
            'Only submitted exam sessions can be assigned historically.',
        });
      }

      // Ensure the target class exists.
      const classRecord =
        await Classes.findByPk(
          classId
        );

      if (!classRecord) {
        return res.status(404).json({
          message:
            'Class not found.',
        });
      }

      // The student must already be enrolled in
      // the historical class being selected.
      const enrollment =
        await ClassEnrollments.findOne({
          where: {
            user_id:
              session.user_id,
            class_id:
              classRecord.id,
            status:
              'enrolled',
          },
        });

      if (!enrollment) {
        return res.status(400).json({
          message:
            'The student must be enrolled in this class before the historical exam result can be assigned.',
        });
      }

      // Ensure the exam still exists.
      const exam =
        await Exams.findByPk(
          session.exam_id
        );

      if (!exam) {
        return res.status(404).json({
          message:
            'Exam not found.',
        });
      }

      // Historical exams predate class-based exam assignment.
      // Add the target class to the exam if that relationship
      // does not already exist.
      const assignedClasses =
        await exam.getClasses({
          where: {
            id: classRecord.id,
          },
          attributes: ['id'],
        });

      if (assignedClasses.length === 0) {
        await exam.addClass(
          classRecord
        );
      }

      // Associate this student's historical session
      // with the class. No assessment data is changed.
      await session.update({
        class_id:
          classRecord.id,
      });

      return res.status(200).json({
        message:
          'Historical exam result assigned successfully.',

        session: {
          id:
            session.id,

          exam_id:
            session.exam_id,

          user_id:
            session.user_id,

          class_id:
            session.class_id,

          attempt_number:
            session.attempt_number,

          score:
            session.score,

          submitted_at:
            session.submitted_at,
        },

        exam_class: {
          exam_id:
            exam.id,

          class_id:
            classRecord.id,
        },
      });

    } catch (err) {

      console.error(
        '❌ Failed to assign historical exam result:',
        err
      );

      return res.status(500).json({
        message:
          'Failed to assign historical exam result.',
        error:
          err.message,
      });

    }

  }
);

/**
 * 📋 View all users with access to an exam
 */
router.get('/:examId/access', auth, isAdmin, async (req, res) => {
  const { examId } = req.params;
  try {
    const accessList = await ExamUserAccess.findAll({
      where: { exam_id: examId },
      include: [
        { model: Users, as: 'users', attributes: ['id', 'first_name', 'last_name', 'email', 'role_id'] },
        { model: Exams, as: 'exams', attributes: ['id', 'title', 'available_from', 'available_until'] },
        { model: Users, as: 'granted_by_user', attributes: ['id', 'first_name', 'last_name', 'email'] }
      ],
      order: [['created_at', 'DESC']],
    });

    res.json(accessList);
  } catch (err) {
    console.error('❌ Error fetching exam access list:', err);
    res.status(500).json({ message: 'Failed to fetch access list' });
  }
});

// 👤 View all exams assigned to a specific user
router.get('/users/:userId/exams', auth, isAdmin, async (req, res) => {
  const { userId } = req.params;
  try {
    const accessibleExams = await ExamUserAccess.findAll({
      where: { user_id: userId },
      include: [
        { model: Exams, as: 'exams', attributes: ['id', 'title', 'available_from', 'available_until'] }
      ],
      order: [['created_at', 'DESC']],
    });

    res.json(accessibleExams);
  } catch (err) {
    console.error('❌ Error fetching user exam list:', err);
    res.status(500).json({ message: 'Failed to fetch user exam list' });
  }
});

// 📊 Summary: count how many users have access per exam
router.get('/summary', auth, isAdmin, async (req, res) => {
  try {
    const examSummary = await ExamUserAccess.findAll({
      attributes: [
        'exam_id',
        [ExamUserAccess.sequelize.fn('COUNT', ExamUserAccess.sequelize.col('user_id')), 'total_students']
      ],
      include: [
        { model: Exams, as: 'exams', attributes: ['id', 'title'] }
      ],
      group: ['exam_id', 'exams.id']
    });

    res.json(examSummary);
  } catch (err) {
    console.error('❌ Error fetching exam summary:', err);
    res.status(500).json({ message: 'Failed to fetch exam summary' });
  }
});

/**
 * 📅 GET /api/admin/exams/upcoming
 * Returns upcoming exams with organization name + enrollment progress
 */
router.get('/upcoming', auth, isAdmin, async (req, res) => {
  try {
    const now = new Date();

    // 1️⃣ Get all exams that have not yet closed
    const exams = await Exams.findAll({
      where: {
        available_until: {
          [Op.gte]: now
        }
      },
      attributes: [
        'id',
        'title',
        'available_from',
        'available_until',
        'duration_minutes',
        'time_zone',
      ],
      include: [
        {
          model: Classes,
          as: 'classes',
          attributes: [
            'id',
            'name',
            'organization_id',
            'program_id',
          ],
          through: {
            attributes: [],
          },
          include: [
            {
              model: Organizations,
              as: 'organization',
              attributes: ['id', 'name'],
            },
            {
              model: Programs,
              as: 'program',
              attributes: ['id', 'name', 'training_type'],
            },
          ],
        },
      ],
      order: [['available_from', 'ASC']]
    });

    // 2️⃣ Load student counts per exam
    const accessCounts = await ExamUserAccess.findAll({
      attributes: [
        'exam_id',
        [Exams.sequelize.fn('COUNT', Exams.sequelize.col('user_id')), 'count']
      ],
      group: ['exam_id']
    });

    // Convert access count array → lookup map
    const enrollmentMap = {};
    accessCounts.forEach((row) => {
      enrollmentMap[row.exam_id] = parseInt(row.dataValues.count, 10);
    });

    // 3️⃣ Format response for UI
    const formatted = exams.map((exam) => {
      const total = enrollmentMap[exam.id] || 0;

      return {
        id: exam.id,
        title: exam.title,
        classes: exam.classes?.map((classItem) => ({
          id: classItem.id,
          name: classItem.name,
          organization: classItem.organization
            ? {
                id: classItem.organization.id,
                name: classItem.organization.name,
              }
            : null,
          program: classItem.program
            ? {
                id: classItem.program.id,
                name: classItem.program.name,
                training_type: classItem.program.training_type,
              }
            : null,
        })) || [],
        duration: `${exam.duration_minutes} min`,

        from: exam.available_from,
        to: exam.available_until,

        timeZone: exam.time_zone,

        enrolled: {
          current: total,
          total: total // You can change later if capacity differs
        },

        progress: total === 0 ? 0 : Math.min(100, (total / total) * 100)
      };
    });

    res.json(formatted);

  } catch (err) {
    console.error("❌ Failed to load upcoming exams:", err);
    res.status(500).json({ message: "Failed to load upcoming exams" });
  }
});

/**
 * 📋 GET /api/admin/exams/scheduled
 * Returns all scheduled exams with assigned classes,
 * participant counts, and status.
 * Supports filtering by organization, program, and class.
 */
router.get('/scheduled', auth, isAdmin, async (req, res) => {

  try {

    const now = new Date();
    const {
      status,
      search,
      organizationId,
      programId,
      classId,
      sortBy = "available_from",
      sortOrder = "DESC",
      page = 1,
      limit = 25,
    } = req.query;

    const exams = await Exams.findAll({

      include: [
        {
          model: Classes,
          as: 'classes',
          attributes: [
            'id',
            'name',
            'organization_id',
            'program_id',
            'status',
          ],
          through: {
            attributes: [],
          },
          include: [
            {
              model: Organizations,
              as: 'organization',
              attributes: ['id', 'name'],
            },
            {
              model: Programs,
              as: 'program',
              attributes: [
                'id',
                'name',
                'training_type',
              ],
            },
          ],
        },
      ],

      order: [
        ['available_from', 'DESC']
      ]
    });

    const accessCounts = await ExamUserAccess.findAll({

      attributes: [
        'exam_id',
        [
          Exams.sequelize.fn(
            'COUNT',
            Exams.sequelize.col('user_id')
          ),
          'count'
        ]
      ],

      group: ['exam_id']

    });

    const participantMap = {};

    accessCounts.forEach((row) => {

      participantMap[row.exam_id] =
        parseInt(row.dataValues.count, 10);

    });

    const formatted = exams.map((exam) => {

      let status = 'Scheduled';

      if (
        now >= exam.available_from &&
        now <= exam.available_until
      ) {
        status = 'Active';
      }

      if (
        now > exam.available_until
      ) {
        status = 'Closed';
      }

      return {

        id: exam.id,

        title: exam.title,

        description: exam.description,

        available_from: exam.available_from,

        available_until: exam.available_until,

        time_zone:
          exam.time_zone,

        duration_minutes:
          exam.duration_minutes,

        classes:
          exam.classes,

        participant_count:
          participantMap[exam.id] || 0,

        status

      };
    });

    let filtered = formatted;

    if (status && status !== 'All') {

      filtered = filtered.filter(
        (exam) =>
          exam.status === status
      );

    }

    if (search) {
      filtered = filtered.filter(
        (exam) =>
          exam.title
            .toLowerCase()
            .includes(
              search.toLowerCase()
            )
      );
    }

    if (organizationId) {
      filtered = filtered.filter(
        (exam) =>
          exam.classes.some(
            (classItem) =>
              classItem.organization_id ===
              Number(organizationId)
          )
      );
    }

    if (programId) {
      filtered = filtered.filter(
        (exam) =>
          exam.classes.some(
            (classItem) =>
              classItem.program_id ===
              Number(programId)
          )
      );
    }

    if (classId) {
      filtered = filtered.filter(
        (exam) =>
          exam.classes.some(
            (classItem) =>
              classItem.id ===
              Number(classId)
          )
      );
    }

    const direction = String(sortOrder).toUpperCase() === "ASC" ? 1 : -1;

    filtered.sort((a, b) => {
      let aValue;
      let bValue;

      switch (sortBy) {
        case "title":
          aValue = a.title || "";
          bValue = b.title || "";
          return aValue.localeCompare(bValue) * direction;

        case "status":
          aValue = a.status || "";
          bValue = b.status || "";
          return aValue.localeCompare(bValue) * direction;

        case "available_until":
          aValue = new Date(a.available_until).getTime();
          bValue = new Date(b.available_until).getTime();
          return (aValue - bValue) * direction;

        case "participant_count":
          return (a.participant_count - b.participant_count) * direction;

        case "available_from":
        default:
          aValue = new Date(a.available_from).getTime();
          bValue = new Date(b.available_from).getTime();
          return (aValue - bValue) * direction;
      }
    });

    const pageNumber = Number(page);
    const pageSize = Number(limit);

    const totalCount = filtered.length;

    const pageCount = Math.ceil(
      totalCount / pageSize
    );

    const paginatedExams =
      filtered.slice(
        (pageNumber - 1) * pageSize,
        pageNumber * pageSize
      );

    res.json({
      exams: paginatedExams,
      totalCount,
      page: pageNumber,
      pageCount
    });

  } catch (err) {

    console.error(
      '❌ Failed to load scheduled exams:',
      err
    );

    res.status(500).json({
      message:
        'Failed to load scheduled exams'
    });
  }
});

/**
 * 🧩 POST /api/admin/exams/:examId/assign-org/:orgId
 * Assign an entire organization to an exam
 * 1. Add organization to exam_organization
 * 2. Assign all users of that organization to ExamUserAccess
 */
// router.post('/:examId/assign-org/:orgId', auth, isAdmin, async (req, res) => {
//   const { examId, orgId } = req.params;

//   try {
//     // Ensure exam exists
//     const exam = await Exams.findByPk(examId);
//     if (!exam) {
//       return res.status(404).json({ message: 'Exam not found.' });
//     }

//     // Ensure organization exists
//     const org = await Organizations.findByPk(orgId);
//     if (!org) {
//       return res.status(404).json({ message: 'Organization not found.' });
//     }

//     // 1️⃣ Insert into exam_organization (if not exists)
//     await exam.addOrganization(org);

//     // 2️⃣ Fetch all users of this org
//     const users = await Users.findAll({
//       where: { organization_id: orgId },
//       attributes: ['id'],
//     });

//     if (users.length === 0) {
//       return res.json({
//         message: `Organization assigned, but no users found in ${org.name}.`,
//       });
//     }

//     // 3️⃣ Assign users to exam if not already assigned
//     let created = 0;
//     for (const user of users) {
//       const exists = await ExamUserAccess.findOne({
//         where: { exam_id: examId, user_id: user.id },
//       });

//       if (!exists) {
//         await ExamUserAccess.create({
//           exam_id: examId,
//           user_id: user.id,
//           max_attempts: 1,
//           granted_by: req.user.id,
//         });
//         created++;
//       }
//     }

//     res.json({
//       message: `Organization assigned successfully.`,
//       exam_id: examId,
//       organization_id: orgId,
//       total_users: users.length,
//       newly_assigned: created,
//     });

//   } catch (err) {
//     console.error('❌ Failed to assign org to exam:', err);
//     res.status(500).json({
//       message: 'Failed to assign organization to exam.',
//       error: err.message,
//     });
//   }
// });

/**
 * 🧩 DELETE /api/admin/exams/:examId/organizations/:orgId
 * Remove organization from exam
 * 1. Remove organization relationship
 * 2. Remove all users from that organization
 *    from ExamUserAccess
 */
// router.delete(
//   '/:examId/organizations/:orgId',
//   auth,
//   isAdmin,
//   async (req, res) => {

//     const { examId, orgId } =
//       req.params;

//     try {

//       const exam =
//         await Exams.findByPk(
//           examId
//         );

//       if (!exam) {

//         return res
//           .status(404)
//           .json({
//             message:
//               'Exam not found.'
//           });

//       }

//       const org =
//         await Organizations.findByPk(
//           orgId
//         );

//       if (!org) {

//         return res
//           .status(404)
//           .json({
//             message:
//               'Organization not found.'
//           });

//       }

//       // Remove organization relationship
//       await exam.removeOrganization(
//         org
//       );

//       // Find all users in organization
//       const users =
//         await Users.findAll({
//           where: {
//             organization_id:
//               orgId
//           },
//           attributes: ['id'],
//         });

//       const userIds =
//         users.map(
//           user => user.id
//         );

//       // Remove access records
//       const removed =
//         await ExamUserAccess.destroy({
//           where: {
//             exam_id: examId,
//             user_id: userIds,
//           },
//         });

//       res.json({

//         message:
//           'Organization removed successfully.',

//         exam_id:
//           examId,

//         organization_id:
//           orgId,

//         users_removed:
//           removed,

//       });

//     } catch (err) {

//       console.error(
//         '❌ Failed to remove organization:',
//         err
//       );

//       res.status(500).json({

//         message:
//           'Failed to remove organization.',

//         error:
//           err.message,

//       });

//     }

//   }
// );

/**
 * 📋 GET /api/admin/exams/:examId
 * Get one scheduled exam with assigned classes and users
 */
router.get('/:examId', auth, isAdmin, async (req, res) => {
  const { examId } = req.params;

  try {
    const exam = await Exams.findByPk(examId, {
      include: [
        {
          model: Classes,
          as: 'classes',
          attributes: [
            'id',
            'name',
            'organization_id',
            'program_id',
            'status',
          ],
          through: {
            attributes: [],
          },
          include: [
            {
              model: Organizations,
              as: 'organization',
              attributes: ['id', 'name'],
            },
            {
              model: Programs,
              as: 'program',
              attributes: [
                'id',
                'name',
                'training_type',
              ],
            },
          ],
        },
        {
          model: ExamTemplates,
          as: 'exam_template',
          attributes: ['id', 'title', 'description']
        },
        {
          model: ExamUserAccess,
          as: 'exam_user_access',
          include: [
            {
              model: Users,
              as: 'users',
              attributes: ['id', 'first_name', 'last_name', 'email', 'organization_id'],
              include: [
                {
                  model: Organizations,
                  as: 'organization',
                  attributes: ['id', 'name']
                }
              ]
            }
          ]
        }
      ]
    });

    if (!exam) {
      return res.status(404).json({
        message: 'Exam not found'
      });
    }

    res.json(exam);

  } catch (err) {
    console.error('❌ Failed to load exam details:', err);

    res.status(500).json({
      message: 'Failed to load exam details',
      error: err.message
    });
  }
});

/**
 * ✏️ PUT /api/admin/exams/:examId
 * Update basic exam details
 */
router.put('/:examId', auth, isAdmin, async (req, res) => {

  const { examId } = req.params;

  const {
    title,
    description,
    localStart,
    localEnd,
    timeZone,
    duration_minutes,
    exam_template_id,
  } = req.body;

  try {

    const exam = await Exams.findByPk(examId);

    if (!exam) {
      return res.status(404).json({
        message: 'Exam not found'
      });
    }

    const zone =
      timeZone ||
      DEFAULT_EXAM_TIME_ZONE;

    const startUTC =
      localToUtcISO(
        localStart,
        zone
      );

    const endUTC =
      localToUtcISO(
        localEnd,
        zone
      );
    
    if (
      exam_template_id !== undefined &&
      exam_template_id !== null &&
      Number(exam_template_id) !== Number(exam.exam_template_id)
    ) {
      const submittedAttempt = await ExamSessions.findOne({
        where: {
          exam_id: exam.id,
          submitted_at: {
            [Op.ne]: null,
          },
        },
        attributes: ["id"],
      });

      if (submittedAttempt) {
        return res.status(400).json({
          message:
            "The exam template cannot be changed because this exam already has submitted attempts.",
        });
      }
    }

    await exam.update({

      title,

      description,

      available_from:
        startUTC,

      available_until:
        endUTC,

      duration_minutes,

      time_zone:
        zone,

      exam_template_id:
        exam_template_id ?? exam.exam_template_id

    });

    res.json({

      message:
        'Exam updated successfully',

      exam

    });

  } catch (err) {

    console.error(
      '❌ Failed to update exam:',
      err
    );

    res.status(500).json({

      message:
        'Failed to update exam',

      error:
        err.message

    });

  }

});

/**
 * 🗑 DELETE /api/admin/exams/:examId
 * Delete an exam session
 */
router.delete(
  '/:examId',
  auth,
  isAdmin,
  async (req, res) => {

    try {

      const { examId } =
        req.params;

      const exam =
        await Exams.findByPk(
          examId
        );

      if (!exam) {

        return res
          .status(404)
          .json({
            message:
              'Exam not found'
          });

      }

      const submittedAttempt =
        await ExamSessions.findOne({
          where: {
            exam_id: exam.id,
            submitted_at: {
              [Op.ne]: null,
            },
          },
          attributes: ['id'],
        });

      if (submittedAttempt) {

        return res
          .status(400)
          .json({
            message:
              'This exam cannot be deleted because it has submitted attempts.'
          });

      }

      await exam.destroy();

      res.json({

        message:
          'Exam deleted successfully'

      });

    } catch (err) {

      console.error(
        '❌ Failed to delete exam:',
        err
      );

      res.status(500).json({

        message:
          'Failed to delete exam'

      });

    }

  }
);

/**
 * 👤 DELETE /api/admin/exams/:examId/users/:userId
 * Remove a specific user from an exam
 */
router.delete(
  '/:examId/users/:userId',
  auth,
  isAdmin,
  async (req, res) => {

    const { examId, userId } =
      req.params;

    try {

      const removed =
        await ExamUserAccess.destroy({
          where: {
            exam_id: examId,
            user_id: userId,
          },
        });

      if (!removed) {

        return res
          .status(404)
          .json({
            message:
              'Assignment not found.'
          });

      }

      res.json({

        message:
          'User removed successfully.',

        exam_id:
          examId,

        user_id:
          userId,

      });

    } catch (err) {

      console.error(
        '❌ Failed to remove user:',
        err
      );

      res.status(500).json({

        message:
          'Failed to remove user.',

        error:
          err.message,

      });

    }

  }
);

module.exports = router;