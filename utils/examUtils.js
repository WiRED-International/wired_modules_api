const ExamQuestions = require('../models/examModels/examQuestions');

/**
 * Calculate score against the total # of questions.
 * - Supports correct_answer as 'a'|'b'|'c'|'d' OR as the option TEXT.
 * - Unanswered or invalid answers count as incorrect.
 */
async function calculateScore(answers, exam_id) {
  try {
    const safeAnswers = Array.isArray(answers) ? answers : [];

    // 1️⃣ Load official questions
    const examQuestions = await ExamQuestions.findAll({
      where: { exam_id },
      attributes: ['id', 'correct_answer', 'options'],
      order: [['id', 'ASC']],
    });

    const total = examQuestions.length;
    if (total === 0) {
      console.warn(`⚠️ [calculateScore] No questions found for exam_id=${exam_id}`);
      return { score: 0, correctCount: 0, total: 0 };
    }

    if (!examQuestions.every(q => q.correct_answer)) {
      console.warn(`⚠️ [calculateScore] Some questions missing correct_answer for exam_id=${exam_id}`);
    }

    // 2️⃣ Build correct answer map
    const correctMap = new Map();
    for (const q of examQuestions) {
      const qid = Number(q.id);
      const options = q.options || {};
      const ca = q.correct_answer;
      let correctKey = (ca == null) ? null : String(ca).trim().toLowerCase();

      // try to resolve text → key if needed
      const validKeys = ['a', 'b', 'c', 'd'];
      if (!validKeys.includes(correctKey)) {
        correctKey = null;
        const target = (ca == null) ? '' : String(ca).trim().toLowerCase();
        for (const [k, v] of Object.entries(options)) {
          const vv = (v == null) ? '' : String(v).trim().toLowerCase();
          if (vv === target) {
            correctKey = k;
            break;
          }
        }
      }

      if (correctKey) correctMap.set(qid, correctKey);
    }

    // 3️⃣ Tally user answers
    let correctCount = 0;
    const selectedMap = new Map();
    for (const a of safeAnswers) {
      const qid = Number(a?.question_id);
      if (!Number.isFinite(qid)) continue;
      const selectedKey = String(a?.selected_option ?? '').trim().toLowerCase();
      if (!selectedKey) continue;
      selectedMap.set(qid, selectedKey);
    }

    for (const q of examQuestions) {
      const qid = Number(q.id);
      const correctKey = correctMap.get(qid);
      const selectedKey = selectedMap.get(qid);
      if (correctKey && selectedKey && correctKey === selectedKey) correctCount++;
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
  const shuffled = [...questions];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];

    // Optionally shuffle options too
    if (deepShuffle && shuffled[i].options) {
      const opts = Object.entries(shuffled[i].options);
      for (let k = opts.length - 1; k > 0; k--) {
        const l = Math.floor(Math.random() * (k + 1));
        [opts[k], opts[l]] = [opts[l], opts[k]];
      }
      shuffled[i].options = Object.fromEntries(opts);
    }
  }

  const questionOrder = shuffled.map(q => q.id);
  return { shuffledQuestions: shuffled, questionOrder };
}

module.exports = {
  calculateScore,
  shuffleArray,
  shuffleExamQuestions,
};