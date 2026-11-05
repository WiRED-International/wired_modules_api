const { createRetryFixtures, cleanupRetryFixtures } = require('./integration/cmeRetryFixtures');

const authorized = { CME_TEST_FIXTURE_WRITE: 'ALLOW_SYNTHETIC_FIXTURES' };
const fixture = { marker: 'cme-retry-11111111-1111-4111-8111-111111111111',
  roleId: 1, userId: 22, moduleId: 33 };
let sequelize;
let models;
let tx;
let events;

beforeEach(() => {
  events = [];
  tx = { LOCK: { UPDATE: 'UPDATE' } };
  sequelize = {
    query: jest.fn(async () => {
      events.push('identity');
      return [{ database_name: 'healthmap_cme_test', account_name: 'healthmap_cme_tester@127.0.0.1' }];
    }),
    transaction: jest.fn(async work => work(tx)),
  };
  models = {};
  for (const name of ['Roles', 'Users', 'Modules', 'QuizScores', 'CmeCreditAwards', 'CmeCreditBalances', 'CmeCertificates']) {
    models[name] = {
      destroy: jest.fn(async () => { events.push(`delete:${name}`); return 1; }),
      findOne: jest.fn(async () => ({ id: 1 })),
    };
  }
  models.Roles.findByPk = jest.fn().mockResolvedValue(null);
  models.Roles.create = jest.fn(async values => { events.push('create:Roles'); return { ...values, id: 1 }; });
  models.Users.create = jest.fn(async values => { events.push('create:Users'); return { ...values, id: 22 }; });
  let nextModuleId = 33;
  models.Modules.create = jest.fn(async values => { events.push('create:Modules'); return { ...values, id: nextModuleId++ }; });
});

test.each([{}, { CME_TEST_SCHEMA_WRITE: 'CREATE_EMPTY_SCHEMA' }, { CME_TEST_FIXTURE_WRITE: 'true' }])(
  'fixture creation and cleanup require their own exact authorization', async env => {
    await expect(createRetryFixtures(sequelize, models, env)).rejects.toThrow('CME_TEST_FIXTURE_WRITE');
    await expect(cleanupRetryFixtures(sequelize, models, fixture, env)).rejects.toThrow('CME_TEST_FIXTURE_WRITE');
    expect(sequelize.transaction).not.toHaveBeenCalled();
    expect(sequelize.query).not.toHaveBeenCalled();
  }
);

test.each(['create', 'cleanup'])('%s rejects wrong identity before any model access', async action => {
  sequelize.query.mockResolvedValueOnce([{ database_name: 'other', account_name: 'root@localhost' }]);
  const work = action === 'create' ? createRetryFixtures(sequelize, models, authorized)
    : cleanupRetryFixtures(sequelize, models, fixture, authorized);
  await expect(work).rejects.toThrow('unexpected database/account');
  expect(models.Roles.findByPk).not.toHaveBeenCalled();
  for (const model of Object.values(models)) {
    expect(model.findOne).not.toHaveBeenCalled();
    expect(model.destroy).not.toHaveBeenCalled();
  }
});

test('creation checks identity on the same transaction and creates marked synthetic records', async () => {
  const result = await createRetryFixtures(sequelize, models, authorized);
  expect(events).toEqual(['identity', 'create:Roles', 'create:Users', 'create:Modules']);
  expect(sequelize.query.mock.calls[0][1].transaction).toBe(tx);
  expect(result).toMatchObject({ roleId: 1, userId: 22, moduleId: 33 });
  expect(result.marker).toMatch(/^cme-retry-[0-9a-f-]{36}$/);
  for (const name of ['Roles', 'Users', 'Modules']) {
    expect(models[name].create.mock.calls[0][1]).toEqual({ transaction: tx });
  }
  expect(models.Users.create.mock.calls[0][0].email).toBe(`${result.marker}@example.invalid`);
  expect(models.Modules.create.mock.calls[0][0]).toMatchObject({
    module_id: result.marker, name: result.marker, cme_credits: 2, credit_type: 'cme', is_archived: false,
  });
});

test('creation refuses an occupied learner role without overwriting or reusing it', async () => {
  models.Roles.findByPk.mockResolvedValueOnce({ id: 1 });
  await expect(createRetryFixtures(sequelize, models, authorized)).rejects.toThrow('occupied');
  expect(events).toEqual(['identity']);
  expect(models.Roles.create).not.toHaveBeenCalled();
});

test('cleanup verifies ownership before deleting only scoped children then parents', async () => {
  await cleanupRetryFixtures(sequelize, models, fixture, authorized);
  expect(events).toEqual(['identity', 'delete:CmeCertificates', 'delete:CmeCreditAwards',
    'delete:CmeCreditBalances', 'delete:QuizScores', 'delete:Users', 'delete:Modules', 'delete:Roles']);
  expect(sequelize.query.mock.calls[0][1].transaction).toBe(tx);
  for (const name of ['Roles', 'Users', 'Modules']) {
    const read = models[name].findOne;
    expect(read).toHaveBeenCalledWith(expect.objectContaining({ transaction: tx, lock: 'UPDATE' }));
    expect(read.mock.invocationCallOrder[0]).toBeLessThan(models.CmeCertificates.destroy.mock.invocationCallOrder[0]);
    expect(models[name].destroy).toHaveBeenCalledWith({ where: read.mock.calls[0][0].where, transaction: tx });
  }
  expect(models.CmeCreditAwards.destroy).toHaveBeenCalledWith({
    where: { user_id: 22, module_id: 33 }, transaction: tx,
  });
  expect(models.QuizScores.destroy).toHaveBeenCalledWith({
    where: { user_id: 22, module_id: 33 }, transaction: tx,
  });
  for (const name of ['CmeCertificates', 'CmeCreditBalances']) {
    expect(models[name].destroy).toHaveBeenCalledWith({ where: { user_id: 22 }, transaction: tx });
  }
});

test.each(['Roles', 'Users', 'Modules'])('unverified %s ownership prevents every deletion', async name => {
  models[name].findOne.mockResolvedValueOnce(null);
  await expect(cleanupRetryFixtures(sequelize, models, fixture, authorized)).rejects.toThrow('ownership');
  expect(events).toEqual(['identity']);
});

test('invalid cleanup marker is rejected without any model write', async () => {
  await expect(cleanupRetryFixtures(sequelize, models, { ...fixture, marker: 'ordinary-user' }, authorized))
    .rejects.toThrow('ownership marker');
  expect(events).toEqual(['identity']);
});

test('failed creation propagates through the managed transaction for rollback', async () => {
  models.Modules.create.mockRejectedValueOnce(new Error('synthetic write failure'));
  await expect(createRetryFixtures(sequelize, models, authorized)).rejects.toThrow('synthetic write failure');
  expect(sequelize.transaction).toHaveBeenCalledTimes(1);
  expect(models.Users.create.mock.calls[0][1].transaction).toBe(tx);
});

test('no fixture means no cleanup connection or writes', async () => {
  await cleanupRetryFixtures(sequelize, models, undefined, authorized);
  expect(sequelize.transaction).not.toHaveBeenCalled();
});

test('three-module fixtures use distinct markers and credit values within one guarded transaction', async () => {
  const result = await createRetryFixtures(sequelize, models, authorized, [2, 3, 5]);
  expect(result.modules.map(module => module.moduleId)).toEqual([33, 34, 35]);
  expect(result.modules.map(module => module.credits)).toEqual([2, 3, 5]);
  expect(result.modules.map(module => module.externalModuleId))
    .toEqual(['A', 'B', 'C'].map(label => `${result.marker}-${label}`));
  expect(result.moduleId).toBe(33); // Single-module callers retain their interface.
  expect(events).toEqual(['identity', 'create:Roles', 'create:Users',
    'create:Modules', 'create:Modules', 'create:Modules']);
  for (const [, options] of models.Modules.create.mock.calls) expect(options.transaction).toBe(tx);
});

test('three-module cleanup verifies all owners before scoped child-first deletion', async () => {
  const result = await createRetryFixtures(sequelize, models, authorized, [2, 3, 5]);
  events = [];
  await cleanupRetryFixtures(sequelize, models, result, authorized);
  expect(events).toEqual(['identity', 'delete:CmeCertificates',
    'delete:CmeCreditAwards', 'delete:CmeCreditAwards', 'delete:CmeCreditAwards',
    'delete:CmeCreditBalances', 'delete:QuizScores', 'delete:QuizScores', 'delete:QuizScores',
    'delete:Users', 'delete:Modules', 'delete:Modules', 'delete:Modules', 'delete:Roles']);
  expect(models.Modules.findOne).toHaveBeenCalledTimes(3);
  for (const call of models.Modules.findOne.mock.invocationCallOrder) {
    expect(call).toBeLessThan(models.CmeCertificates.destroy.mock.invocationCallOrder[0]);
  }
  for (const [index, module] of result.modules.entries()) {
    expect(models.Modules.destroy.mock.calls[index][0]).toEqual({ where: {
      id: module.moduleId, module_id: module.externalModuleId, name: module.externalModuleId,
    }, transaction: tx });
    expect(models.CmeCreditAwards.destroy.mock.calls[index][0]).toEqual({
      where: { user_id: result.userId, module_id: module.moduleId }, transaction: tx,
    });
  }
});

test('a missing third module owner blocks all cleanup writes', async () => {
  const result = await createRetryFixtures(sequelize, models, authorized, [2, 3, 5]);
  models.Modules.findOne.mockResolvedValueOnce({ id: 33 }).mockResolvedValueOnce({ id: 34 })
    .mockResolvedValueOnce(null);
  await expect(cleanupRetryFixtures(sequelize, models, result, authorized)).rejects.toThrow('ownership');
  for (const model of Object.values(models)) expect(model.destroy).not.toHaveBeenCalled();
});

test('foreign module marker in a manifest blocks cleanup before model access', async () => {
  const result = await createRetryFixtures(sequelize, models, authorized, [2, 3, 5]);
  result.modules[2].externalModuleId = 'unrelated-module';
  await expect(cleanupRetryFixtures(sequelize, models, result, authorized)).rejects.toThrow('ownership marker');
  expect(models.Modules.findOne).not.toHaveBeenCalled();
  for (const model of Object.values(models)) expect(model.destroy).not.toHaveBeenCalled();
});

test.each([[2, 2, 5], [0, 3, 5], [2, -3], [2, 3, 5, 7]])(
  'invalid credit configuration %j is rejected before database work', async (...credits) => {
    await expect(createRetryFixtures(sequelize, models, authorized, credits)).rejects.toThrow('distinct positive');
    expect(sequelize.transaction).not.toHaveBeenCalled();
  }
);

test('two-module fixtures create distinct owned records and clean up both pairs', async () => {
  const result = await createRetryFixtures(sequelize, models, authorized, [2, 3]);
  expect(result.modules.map(module => module.moduleId)).toEqual([33, 34]);
  expect(result.modules.map(module => module.credits)).toEqual([2, 3]);
  expect(result.modules.map(module => module.externalModuleId)).toEqual([
    `${result.marker}-A`, `${result.marker}-B`,
  ]);
  events = [];
  await cleanupRetryFixtures(sequelize, models, result, authorized);
  expect(events).toEqual(['identity', 'delete:CmeCertificates', 'delete:CmeCreditAwards',
    'delete:CmeCreditAwards', 'delete:CmeCreditBalances', 'delete:QuizScores',
    'delete:QuizScores', 'delete:Users', 'delete:Modules', 'delete:Modules', 'delete:Roles']);
  expect(models.CmeCreditAwards.destroy.mock.calls.map(([options]) => options.where))
    .toEqual([{ user_id: 22, module_id: 33 }, { user_id: 22, module_id: 34 }]);
});

test('a missing second module owner prevents cleanup of either module', async () => {
  const result = await createRetryFixtures(sequelize, models, authorized, [2, 3]);
  models.Modules.findOne.mockResolvedValueOnce({ id: 33 }).mockResolvedValueOnce(null);
  await expect(cleanupRetryFixtures(sequelize, models, result, authorized)).rejects.toThrow('ownership');
  for (const model of Object.values(models)) expect(model.destroy).not.toHaveBeenCalled();
});
