# CME award integrity

`POST /quiz-scores` serializes CME submissions on the authenticated user's
database row. The lifetime ledger lookup is a locking read after that lock;
score upsert, award creation, balance update, and certificate database writes
share the transaction. Duplicate requests return success with zero new credits.
Retakes continue replacing the mutable `quiz_scores` result. Non-CME submissions
still use the existing highest-score service and enrollment checks; formal exam
routes are unchanged.

## Award-year policy

New CME credits belong to the server-local calendar year when the backend first
accepts and records a qualifying submission, regardless of quiz completion date.
Users completing quizzes offline must submit before the calendar-year deadline
to count toward that year. No new reporting timezone is introduced.

For a new qualifying award, the route captures one server timestamp after
obtaining the user lock and confirming that no lifetime award exists, immediately
before award creation. This is the logical acceptance time for an award whose
transaction subsequently commits successfully, not the literal database COMMIT
timestamp. An award captured just before midnight retains that year even if its
transaction commits after midnight. A failed transaction records no award; a
successful retry captures a fresh acceptance time.

The captured timestamp supplies `awarded_at`; its server-local year supplies the
ledger year, balance rollover, annual 50-credit threshold, and certificate year.
An automatically triggered certificate uses that same timestamp as `issued_at`.
Client `date_taken` remains the quiz completion date in the mutable score and the
new award's `credited_date_taken` snapshot. Retries and retakes never move an
existing award to another year or replace its score, completion date, or award
timestamp. Historical awards, opening balances, and NULL snapshots are unchanged.
No additional migration is required for this policy correction.

## Required schema change

Deploy `20261103000000-add-cme-award-score-snapshot.js` before the updated code.
It adds nullable `credited_score` and `credited_date_taken` to the award ledger.
New awards snapshot their submitted score and date independently of retakes.
The existing award year and `awarded_at` are never changed by resubmission.
This migration has not been run as part of this change.

## Historical limits

`quiz_scores` has only one mutable row per user/module, without attempt history
or a link to the original award. Existing ledger rows have a year and award
timestamp but no credited score. Matching a current score's year to an award's
year does not prove it was the credited attempt. No historical values are
inferred or backfilled; existing snapshots remain NULL.

The previous historical backfill preserved opening balances and inserted
zero-credit award markers only for visible passing scores in the user's balance
year with a positive balance. It cannot establish all earlier awards or recover
overwritten attempts. Such missing history requires authoritative source data
and manual review. Existing award rows, including zero-credit markers, block
new credit across all years.

The existing database unique index remains `(user_id, module_id, year)`.
Lifetime serialization is enforced by this route's user lock; any future award
writer must follow the same protocol. A database-wide lifetime unique index
would require reviewing existing cross-year duplicates first. This change does
not delete, consolidate, or rewrite historical awards.

## Focused verification

Run `npm test -- --runInBand tests/cmeQuizSubmission.test.js`.
The isolated route tests model transactional commit/rollback and exclusive user
locks without opening a database connection. They do not replace a real MySQL
concurrency test; none is run against any database here.
