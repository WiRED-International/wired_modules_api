const ExamQuestions = require('../models/examModels/examQuestions');

/**
 * Calculate score against the total # of questions.
 * - Supports correct_answers as 'a'|'b'|'c'|'d' OR as the option TEXT.
 * - Unanswered or invalid answers count as incorrect.
 */
async function calculateScore(answers, exam_id) {
  try {
    const safeAnswers = Array.isArray(answers) ? answers : [];

    // 1️⃣ Load questions
    const examQuestions = await ExamQuestions.findAll({
      where: { exam_id },
      attributes: ['id', 'question_type', 'correct_answers', 'options'],
      order: [['id', 'ASC']],
    });

    const total = examQuestions.length;
    if (total === 0) {
      console.warn(`⚠️ [calculateScore] No questions found for exam_id=${exam_id}`);
      return { score: 0, correctCount: 0, total: 0 };
    }

    // 2️⃣ Build correct answers map
    console.log('Sample question data:', examQuestions[0]?.toJSON());
    const correctMap = new Map();
    for (const q of examQuestions) {
      const qid = Number(q.id);
      const ca = q.correct_answers;
      const qtype = q.question_type || 'single';

      let correctKeys = [];

      if (Array.isArray(ca)) {
        correctKeys = ca.map(k => String(k).trim().toLowerCase());
      } else if (typeof ca === 'string') {
        correctKeys = [String(ca).trim().toLowerCase()];
      }

      if (correctKeys.length > 0) {
        correctMap.set(qid, { type: qtype, keys: correctKeys });
      }
    }

    // 3️⃣ Build user answers map
    const selectedMap = new Map();
    for (const a of safeAnswers) {
      const qid = Number(a?.question_id);
      if (!Number.isFinite(qid)) continue;

      let selected = [];
      if (Array.isArray(a?.selected_option_ids)) {
        selected = a.selected_option_ids.map(k => String(k).trim().toLowerCase());
      } else if (Array.isArray(a?.selected_options)) {
        selected = a.selected_options.map(k => String(k).trim().toLowerCase());
      } else if (a?.selected_option_id) {
        selected = [String(a.selected_option_id).trim().toLowerCase()];
      } else if (a?.selected_option) {
        selected = [String(a.selected_option).trim().toLowerCase()];
      }

      if (selected.length > 0) selectedMap.set(qid, selected);
    }

    // ✅ Debug check — after both maps are filled
    for (const q of examQuestions) {
      const qid = Number(q.id);
      console.log(
        `Q${qid}: correct=${JSON.stringify(correctMap.get(qid)?.keys)}, user=${JSON.stringify(selectedMap.get(qid))}`
      );
    }

    // 4️⃣ Compare answers
    let correctCount = 0;
    for (const q of examQuestions) {
      const qid = Number(q.id);
      const correctObj = correctMap.get(qid);
      const selected = selectedMap.get(qid);
      if (!correctObj || !selected) continue;

      const correctKeys = correctObj.keys;

      const selectedSet = new Set(selected);
      const correctSet = new Set(correctKeys);

      const allMatch =
        selectedSet.size === correctSet.size &&
        [...selectedSet].every(x => correctSet.has(x));

      if (allMatch) correctCount++;
    }

    const score = (correctCount / total) * 100;

    console.log(
      `📊 [calculateScore] exam_id=${exam_id} -> ${correctCount}/${total} correct (${score.toFixed(2)}%)`
    );
    return { score, correctCount, total };
  } catch (err) {
    console.error('❌ Error calculating score:', err);
    return { score: 0, correctCount: 0, total: 0 };
  }
}

/**
 * Fisher-Yates shuffle — unbiased random order
 */
function shuffleArray(array) {
  if (!Array.isArray(array)) return array;
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Shuffles exam questions and each question’s options.
 * Optionally returns the shuffle order for reproducibility.
 */
function shuffleExamQuestions(questions, deepShuffle = true) {
  if (!Array.isArray(questions)) {
    console.warn(`⚠️ [shuffleExamQuestions] Expected an array, got:`, questions);
    return { shuffledQuestions: [], questionOrder: [] };
  }

  // Fisher-Yates shuffle
  const shuffled = [...questions].sort(() => Math.random() - 0.5);

  const processed = shuffled.map((q, index) => {
    let shuffledOptions = q.options;

    // Shuffle options if enabled
    if (deepShuffle && q.options && typeof q.options === 'object') {
      const opts = Object.entries(q.options);
      const shuffledOpts = opts.sort(() => Math.random() - 0.5);
      shuffledOptions = Object.fromEntries(shuffledOpts);
    }

    // 🧠 Always preserve the question ID and add display order
    return {
      id: q.id, // ✅ keep real DB ID
      order: index + 1,
      question_type: q.question_type || 'single',
      question_text: q.question_text,
      options: shuffledOptions,
    };
  });

  // Return both processed questions and ID order
  const questionOrder = processed.map(q => q.id);
  return { shuffledQuestions: processed, questionOrder };
}

module.exports = {
  calculateScore,
  shuffleArray,
  shuffleExamQuestions,
};