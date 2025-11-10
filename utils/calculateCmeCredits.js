const PASSING_SCORE = 80;
const CREDITS_PER_PASS = 5;

function calculateCmeCredits(quizScores, currentYear = new Date().getFullYear()) {
  if (!quizScores || quizScores.length === 0) return 0;

  let credits = 0;
  for (const q of quizScores) {
    const quizYear = new Date(q.date_taken).getFullYear();
    const creditType = (q.module?.credit_type || "").trim().toLowerCase();
    if (q.score >= PASSING_SCORE && quizYear === currentYear && creditType === "cme") {
      credits += CREDITS_PER_PASS;
    }
  }
  return credits;
}

module.exports = { calculateCmeCredits };