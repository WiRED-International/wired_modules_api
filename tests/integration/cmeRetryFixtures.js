'use strict';

const { randomUUID } = require('crypto');
const { QueryTypes } = require('sequelize');

async function withFixtureWrites(sequelize, env, work) {
  if (env.CME_TEST_FIXTURE_WRITE !== 'ALLOW_SYNTHETIC_FIXTURES') {
    throw new Error('CME_TEST_FIXTURE_WRITE must explicitly equal ALLOW_SYNTHETIC_FIXTURES.');
  }
  return sequelize.transaction(async transaction => {
    // Pin the identity check and all fixture writes to the same connection.
    const [identity] = await sequelize.query(
      'SELECT DATABASE() AS database_name, CURRENT_USER() AS account_name',
      { type: QueryTypes.SELECT, transaction }
    );
    if (identity?.database_name !== 'healthmap_cme_test' ||
        identity?.account_name !== 'healthmap_cme_tester@127.0.0.1') {
      throw new Error('CME fixture writes refused: unexpected database/account identity.');
    }
    return work(transaction);
  });
}

async function createRetryFixtures(sequelize, models, env = process.env, creditValues = [2]) {
  if (!Array.isArray(creditValues) || ![1, 2, 3].includes(creditValues.length) ||
      creditValues.some(value => !Number.isSafeInteger(value) || value <= 0) ||
      new Set(creditValues).size !== creditValues.length) {
    throw new Error('CME fixture creation requires one to three distinct positive integer credit values.');
  }
  const marker = `cme-retry-${randomUUID()}`;
  return withFixtureWrites(sequelize, env, async transaction => {
    // Learner role is ID 1 in the real backend. Never overwrite an existing role.
    if (await models.Roles.findByPk(1, { transaction })) {
      throw new Error('CME fixture creation refused: learner role ID 1 is occupied.');
    }
    const role = await models.Roles.create({ id: 1, name: marker }, { transaction });
    const user = await models.Users.create({
      first_name: 'Synthetic', last_name: 'CME learner',
      email: `${marker}@example.invalid`, password: randomUUID(), role_id: role.id,
      cme_year: new Date().getFullYear(), cme_credits: 0,
    }, { transaction });
    const modules = [];
    for (const [index, credits] of creditValues.entries()) {
      const identifier = creditValues.length === 1 ? marker : `${marker}-${'ABC'[index]}`;
      const module = await models.Modules.create({
        name: identifier, module_id: identifier, credit_type: 'cme', cme_credits: credits,
        is_archived: false, has_quiz: true,
      }, { transaction });
      modules.push({ moduleId: module.id, externalModuleId: module.module_id, credits });
    }
    return { marker, roleId: role.id, userId: user.id, modules,
      moduleId: modules[0].moduleId, externalModuleId: modules[0].externalModuleId };
  });
}

async function cleanupRetryFixtures(sequelize, models, fixture, env = process.env) {
  if (!fixture) return;
  return withFixtureWrites(sequelize, env, async transaction => {
    if (!/^cme-retry-[0-9a-f-]{36}$/.test(fixture.marker)) {
      throw new Error('CME fixture cleanup refused: invalid ownership marker.');
    }
    const userWhere = { id: fixture.userId, email: `${fixture.marker}@example.invalid`, role_id: fixture.roleId };
    const modules = fixture.modules || [{ moduleId: fixture.moduleId, externalModuleId: fixture.marker }];
    if (![1, 2, 3].includes(modules.length) || new Set(modules.map(module => module.moduleId)).size !== modules.length) {
      throw new Error('CME fixture cleanup refused: invalid module ownership manifest.');
    }
    const moduleWheres = modules.map((module, index) => {
      const identifier = modules.length === 1 ? fixture.marker : `${fixture.marker}-${'ABC'[index]}`;
      if (module.externalModuleId !== identifier) {
        throw new Error('CME fixture cleanup refused: invalid module ownership marker.');
      }
      return { id: module.moduleId, module_id: identifier, name: identifier };
    });
    const roleWhere = { id: fixture.roleId, name: fixture.marker };
    const options = { transaction, lock: transaction.LOCK.UPDATE };
    const user = await models.Users.findOne({ where: userWhere, ...options });
    const ownedModules = [];
    for (const where of moduleWheres) {
      ownedModules.push(await models.Modules.findOne({ where, ...options }));
    }
    const role = await models.Roles.findOne({ where: roleWhere, ...options });
    if (!user || ownedModules.some(module => !module) || !role || fixture.roleId !== 1) {
      throw new Error('CME fixture cleanup refused: synthetic ownership could not be verified.');
    }
    // Children first; no truncation, FK disabling, table reset, or broad deletion.
    await models.CmeCertificates.destroy({ where: { user_id: fixture.userId }, transaction });
    for (const module of modules) {
      await models.CmeCreditAwards.destroy({ where: { user_id: fixture.userId, module_id: module.moduleId }, transaction });
    }
    await models.CmeCreditBalances.destroy({ where: { user_id: fixture.userId }, transaction });
    for (const module of modules) {
      await models.QuizScores.destroy({ where: { user_id: fixture.userId, module_id: module.moduleId }, transaction });
    }
    await models.Users.destroy({ where: userWhere, transaction });
    for (const where of moduleWheres) {
      await models.Modules.destroy({ where, transaction });
    }
    await models.Roles.destroy({ where: roleWhere, transaction });
  });
}

module.exports = { createRetryFixtures, cleanupRetryFixtures };
