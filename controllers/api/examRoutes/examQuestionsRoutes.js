// const express = require('express');
// const router = express.Router();
// const { ExamQuestions } = require('../../models');
// const auth = require("../../../middleware/auth");

// // GET /exams/:id/questions - Fetch all questions for a given exam
// router.get('/exams/:id/questions', auth, async (req, res) => {
//   const { id } = req.params;
//   const includeAnswers = req.query.includeAnswers === 'true';

//   try {
//     const questions = await ExamQuestions.findAll({
//       where: { exam_id: id },
//       order: [['order', 'ASC']],
//       attributes: includeAnswers
//         ? undefined // include all fields (with correct_answers)
//         : { exclude: ['correct_answers'] }, // hide correct_answers for non-admin requests
//     });

//     if (!questions || questions.length === 0) {
//       return res.status(404).json({ message: `No questions found for exam ID ${id}` });
//     }

//     res.status(200).json({
//       message: `✅ Retrieved ${questions.length} question(s) for exam ${id}`,
//       count: questions.length,
//       includeAnswers,
//       questions,
//     });
//   } catch (error) {
//     console.error('❌ Failed to fetch questions:', error);
//     res.status(500).json({
//       message: 'Failed to fetch exam questions',
//       error: error.message,
//     });
//   }
// });

// // GET /exams/:id/questions - Fetch all exam questions (without correct answers)
// router.post('/exams/:id/questions', auth, async (req, res) => {
//   const { id } = req.params;
//   const { questions } = req.body;

//   try {
//     if (!Array.isArray(questions) || questions.length === 0) {
//       return res.status(400).json({ message: 'Questions array is required' });
//     }

//     const formattedQuestions = questions.map((q, index) => {
//       let correctAnswers = [];

//       if (Array.isArray(q.correct_answers)) {
//         correctAnswers = q.correct_answers;
//       } else if (Array.isArray(q.correct_answer)) {
//         correctAnswers = q.correct_answer;
//       } else if (typeof q.correct_answers === 'string') {
//         try {
//           correctAnswers = JSON.parse(q.correct_answers);
//         } catch {
//           correctAnswers = [];
//         }
//       }

//       return {
//         exam_id: Number(id),
//         question_type: q.question_type || 'single',
//         question_text: q.question_text?.trim(),
//         options: q.options || {},
//         correct_answers: correctAnswers,  // ✅ store JSON array
//         order: q.order ?? index + 1,
//         created_at: new Date(),
//         updated_at: new Date(),
//       };
//     });

//     // 🧩 Debugging output
//     console.log('\n🧪 [DEBUG] First formatted question:');
//     console.dir(formattedQuestions[0], { depth: null });

//     // Validate fields
//     for (const fq of formattedQuestions) {
//       if (!fq.question_text || !Object.keys(fq.options).length) {
//         return res.status(400).json({
//           message: 'Each question must include both question_text and at least one option',
//         });
//       }
//       if (!Array.isArray(fq.correct_answers)) {
//         return res.status(400).json({
//           message: 'correct_answers must be an array',
//         });
//       }
//     }

//     // 🧮 Bulk insert
//     const created = await ExamQuestions.bulkCreate(formattedQuestions);
//     console.log(`✅ [DEBUG] Created ${created.length} questions`);

//     // Fetch one back to confirm what got stored
//     const check = await ExamQuestions.findOne({ where: { exam_id: id } });
//     console.log('🧩 [DEBUG] DB stored sample:', check?.toJSON());

//     res.status(201).json({
//       message: '✅ Questions added successfully',
//       count: created.length,
//     });
//   } catch (error) {
//     console.error('❌ Failed to add questions:', error);
//     res.status(500).json({
//       message: 'Failed to add questions',
//       error: error.message,
//     });
//   }
// });

// // PUT /exams/:id/questions - Update existing exam questions
// router.put('/exams/:id/questions', auth, async (req, res) => {
//   const { id } = req.params;
//   const { questions } = req.body;

//   try {
//     if (!Array.isArray(questions) || questions.length === 0) {
//       return res.status(400).json({ message: 'Questions array is required' });
//     }

//     const updates = [];
//     const newQuestions = [];

//     for (const [index, q] of questions.entries()) {
//       // Normalize correct_answers input
//       let correctAnswers = [];
//       if (Array.isArray(q.correct_answers)) {
//         correctAnswers = q.correct_answers;
//       } else if (typeof q.correct_answers === 'string') {
//         try {
//           correctAnswers = JSON.parse(q.correct_answers);
//         } catch {
//           correctAnswers = [];
//         }
//       }

//       // ✅ Case 1: Update existing question (if ID provided)
//       if (q.id) {
//         const question = await ExamQuestions.findOne({
//           where: { id: q.id, exam_id: id },
//         });

//         if (!question) {
//           console.warn(`⚠️ Question ID ${q.id} not found for exam ${id}. Skipping.`);
//           continue;
//         }

//         await question.update({
//           question_type: q.question_type ?? question.question_type,
//           question_text: q.question_text?.trim() ?? question.question_text,
//           options: q.options ?? question.options,
//           correct_answers: correctAnswers.length > 0 ? correctAnswers : question.correct_answers,
//           order: q.order ?? question.order,
//           updated_at: new Date(),
//         });

//         updates.push(question);
//       }

//       // ✅ Case 2: Add new question (no ID provided)
//       else {
//         if (!q.question_text || !q.options) {
//           console.warn(`⚠️ Skipping question at index ${index}: missing question_text or options.`);
//           continue;
//         }

//         const newQ = {
//           exam_id: Number(id),
//           question_type: q.question_type || 'single',
//           question_text: q.question_text.trim(),
//           options: q.options,
//           correct_answers: correctAnswers,
//           order: q.order ?? index + 1,
//           created_at: new Date(),
//           updated_at: new Date(),
//         };

//         newQuestions.push(newQ);
//       }
//     }

//     // Bulk insert new ones (if any)
//     if (newQuestions.length > 0) {
//       const created = await ExamQuestions.bulkCreate(newQuestions);
//       console.log(`🆕 Added ${created.length} new questions`);
//       updates.push(...created);
//     }

//     res.status(200).json({
//       message: `✅ Updated ${updates.length} question(s) successfully (includes new + existing)`,
//       updatedCount: updates.filter(q => q.id).length,
//       addedCount: newQuestions.length,
//     });
//   } catch (error) {
//     console.error('❌ Failed to update/add questions:', error);
//     res.status(500).json({
//       message: 'Failed to update/add exam questions',
//       error: error.message,
//     });
//   }
// });