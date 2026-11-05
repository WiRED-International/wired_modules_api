'use strict';

// Mock external delivery only; certificate issuance and all database work stay real.
jest.mock('../../services/email', () => ({ sendCme50AchievedEmail: jest.fn() }));

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const sequelize = require('../../config/connection');
const models = require('../../models');
const { sendCme50AchievedEmail } = require('../../services/email');
const { createRetryFixtures, cleanupRetryFixtures } = require('./cmeRetryFixtures');
const installOverlap = require('./cmeTransactionOverlap');

const app = express();
app.use(express.json());
app.use('/quiz-scores', require('../../controllers/api/moduleRoutes/quizScoreRoutes'));
app.use('/users', require('../../controllers/api/userRoutes/userRoutes'));

test('overlapping different-module submissions crossing 50 credits persist both awards and exactly one certificate and email', async () => {
  let fixture;
  let overlap;
  let consoleError;
  let pending;
  async function database(work) {
    try { return await work(); } catch {
      throw new Error('CME certificate threshold database operation refused or failed; review authorization, identity, schema, and fixture ownership. Driver details withheld.');
    }
  }

  try {
    expect(sequelize.connectionManager.pool.maxSize).toBeGreaterThanOrEqual(2);
    // Either module alone stays below 50; both together cross the threshold.
    fixture = await database(() => createRetryFixtures(sequelize, models, process.env, [24, 27]));
    const year = new Date().getFullYear();
    const where = { user_id: fixture.userId };
    const initialUser = await database(() => models.Users.findByPk(fixture.userId, { raw: true }));
    expect(initialUser).toMatchObject({ cme_year: year, cme_credits: 0, cme_certificate_issued_at: null });
    for (const model of [models.QuizScores, models.CmeCreditAwards, models.CmeCertificates, models.CmeCreditBalances]) {
      expect(await database(() => model.count({ where }))).toBe(0);
    }
    const expectedCredits = fixture.modules.reduce((sum, module) => sum + module.credits, 0);
    expect(expectedCredits).toBe(51);
    expect(fixture.modules.every(module => module.credits < 50)).toBe(true);
    expect(new Set(fixture.modules.map(module => module.moduleId)).size).toBe(2);
    const token = jwt.sign({ id: fixture.userId, roleId: fixture.roleId }, process.env.SECRET);
    const payloads = fixture.modules.map((module, index) => ({
      module_id: module.externalModuleId, score: [88, 96][index],
      date_taken: new Date(year - 1, 11, 20 + index, 12).toISOString(),
    }));
    sendCme50AchievedEmail.mockReset();
    // Suppress raw driver logging on an unexpected route failure. Status and
    // persistence assertions below still fail; no error response is accepted.
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    overlap = installOverlap(models.Users, fixture.userId);
    const startedAt = Date.now();
    // No client timeout: await both server responses before any fixture cleanup.
    pending = Promise.allSettled(payloads.map(payload => request(app).post('/quiz-scores')
      .set('Authorization', `Bearer ${token}`).send(payload)));
    const outcomes = await pending;
    overlap.verify();
    overlap.dispose();
    overlap = null;
    expect(outcomes.map(outcome => outcome.status)).toEqual(['fulfilled', 'fulfilled']);
    for (const [index, outcome] of outcomes.entries()) {
      const response = outcome.value;
      expect([200, 201]).toContain(response.status);
      expect(response.body.passed).toBe(true);
      expect(response.body.credit_type).toBe('cme');
      expect(response.body.credits_awarded).toBe(fixture.modules[index].credits);
      expect(response.body.quizScore).toMatchObject({ user_id: fixture.userId,
        module_id: fixture.modules[index].moduleId, score: payloads[index].score });
    }
    expect(consoleError).not.toHaveBeenCalled();

    // Fresh SELECTs after both requests settle, with no transaction option and
    // before cleanup. No year filter on awards: check lifetime uniqueness.
    const awards = await database(() => models.CmeCreditAwards.findAll({ where, raw: true }));
    const scores = await database(() => models.QuizScores.findAll({ where, raw: true }));
    expect(awards).toHaveLength(2);
    expect(scores).toHaveLength(2);
    for (const [index, module] of fixture.modules.entries()) {
      const moduleAwards = awards.filter(award => award.module_id === module.moduleId);
      expect(moduleAwards).toHaveLength(1);
      expect(moduleAwards[0]).toMatchObject({ ...where, year, credits_awarded: module.credits,
        credited_score: payloads[index].score, credited_date_taken: new Date(payloads[index].date_taken) });
      expect(moduleAwards[0].awarded_at.getFullYear()).toBe(year);
      const moduleScores = scores.filter(score => score.module_id === module.moduleId);
      expect(moduleScores).toHaveLength(1);
      expect(moduleScores[0]).toMatchObject({ ...where, score: payloads[index].score,
        date_taken: new Date(payloads[index].date_taken) });
    }
    expect(awards.reduce((sum, award) => sum + award.credits_awarded, 0)).toBe(expectedCredits);
    const user = await database(() => models.Users.findByPk(fixture.userId, { raw: true }));
    expect(user.cme_year).toBe(year);
    expect(user.cme_credits).toBe(expectedCredits);
    expect(await database(() => models.CmeCreditBalances.count({ where }))).toBe(0);
    const certificates = await database(() => models.CmeCertificates.findAll({ where, raw: true }));
    expect(certificates).toHaveLength(1);
    const certificate = certificates[0];
    expect(certificate).toMatchObject({ ...where, year, pdf_path: null });
    expect(Number.isSafeInteger(certificate.sequence_number)).toBe(true);
    expect(certificate.sequence_number).toBeGreaterThan(0);
    // Never assume the year's global sequence starts at 1: preserve other fixtures.
    expect(certificate.certificate_id).toBe(`WIRED-CME-${year}-${String(certificate.sequence_number).padStart(6, '0')}`);
    expect(certificate.issued_at).toBeInstanceOf(Date);
    expect(certificate.issued_at.getTime()).toBeGreaterThanOrEqual(Math.floor(startedAt / 1000) * 1000);
    expect(certificate.issued_at.getTime()).toBeLessThanOrEqual(Date.now());
    expect(user.cme_certificate_issued_at).toEqual(certificate.issued_at);
    expect(awards.some(award => award.awarded_at.getTime() === certificate.issued_at.getTime())).toBe(true);
    expect(sendCme50AchievedEmail).toHaveBeenCalledTimes(1);
    const [emailedUser, emailedCertificate] = sendCme50AchievedEmail.mock.calls[0];
    expect(emailedUser.id).toBe(fixture.userId);
    expect(emailedUser.cme_credits).toBe(expectedCredits);
    expect(emailedCertificate.id).toBe(certificate.id);
    expect(emailedCertificate.certificate_id).toBe(certificate.certificate_id);
    expect(emailedCertificate.year).toBe(year);
    // ORM instances retain millisecond precision; MySQL DATE fields may not.
    expect(Math.floor(emailedCertificate.issued_at.getTime() / 1000)).toBe(Math.floor(certificate.issued_at.getTime() / 1000));

    const profile = await request(app).get('/users/me').set('Authorization', `Bearer ${token}`);
    expect(profile.status).toBe(200);
    expect(profile.body.id).toBe(fixture.userId);
    expect(profile.body.quizScores).toHaveLength(2);
    expect(profile.body.cmeCredits).toEqual({ status: 'available', annualRequirement: 50,
      currentYear: { year, earnedCredits: expectedCredits },
      previousYear: { year: year - 1, earnedCredits: 0 } });
    expect(sendCme50AchievedEmail).toHaveBeenCalledTimes(1);
    // Fail explicitly across New Year rather than changing application clocks.
    expect(new Date().getFullYear()).toBe(year);
  } finally {
    // Release the barrier before draining requests; never delete live request fixtures.
    overlap?.dispose();
    try {
      if (pending) await pending;
    } finally {
      consoleError?.mockRestore();
      sendCme50AchievedEmail.mockReset();
      try {
        // Existing helper checks marker ownership and deletes only these fixtures.
        await database(() => cleanupRetryFixtures(sequelize, models, fixture));
      } finally {
        await database(() => sequelize.close());
      }
    }
  }
}, 60000);
