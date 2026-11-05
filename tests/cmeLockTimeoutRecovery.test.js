const installRecovery = require('./integration/cmeLockTimeoutRecovery');
let Users;
let sequelize;
let blocker;
let hook;
let observer;
let original;
let failure;
let reads;
const transaction = () => ({ connection: {}, finished: undefined, id: Symbol('attempt') });

beforeEach(() => {
  reads = 0;
  failure = Object.assign(new Error('synthetic driver error used only by unit tests'), {
    parent: { code: 'ER_LOCK_WAIT_TIMEOUT', errno: 1205, sqlState: 'HY000' },
    sql: 'SELECT * FROM `users` WHERE id = 22 FOR UPDATE',
  });
  sequelize = { query: jest.fn().mockResolvedValue([]) };
  blocker = transaction();
  blocker.rollback = jest.fn(async () => { blocker.finished = 'rollback'; });
  original = jest.fn(async (id, options) => {
    await hook({ ...options, where: { id } });
    reads++;
    if (reads === 1) throw failure;
    return { id };
  });
  Users = { findByPk: original,
    addHook: jest.fn((type, name, callback) => { hook = callback; }), removeHook: jest.fn() };
  observer = installRecovery(sequelize, Users, 22, blocker);
});
afterEach(() => observer.dispose());

const lookup = (Users, tx) => Users.findByPk(22, { transaction: tx, lock: 'UPDATE' });

test('observes and rethrows the exact error then releases blocker only at fresh retry', async () => {
  const first = transaction();
  await expect(lookup(Users, first)).rejects.toBe(failure);
  expect(blocker.rollback).not.toHaveBeenCalled();
  expect(observer.attempts[0].error).toEqual({ code: 'ER_LOCK_WAIT_TIMEOUT', errno: 1205,
    sqlState: 'HY000', userLockSql: true });
  first.finished = 'rollback'; // Route does this, not the observer.
  const second = transaction();
  const result = await lookup(Users, second);
  expect(result).toEqual({ id: 22 });
  expect(blocker.rollback).toHaveBeenCalledTimes(1);
  expect(observer.attempts[1].blockerReleased).toBe(true);
  expect(sequelize.query.mock.calls).toEqual([
    ['SET SESSION innodb_lock_wait_timeout = 1', { transaction: first }],
    ['SET SESSION innodb_lock_wait_timeout = 1', { transaction: second }],
  ]);
  expect(blocker.rollback.mock.invocationCallOrder[0]).toBeLessThan(sequelize.query.mock.invocationCallOrder[1]);
});

test.each(['no rollback', 'wrong code', 'wrong errno', 'wrong state', 'not user lock'])(
  '%s prevents treating the retry as a genuine rolled-back user-lock timeout', async issue => {
    const first = transaction();
    await expect(lookup(Users, first)).rejects.toBe(failure);
    first.finished = issue === 'no rollback' ? undefined : 'rollback';
    const observed = observer.attempts[0].error;
    if (issue === 'wrong code') observed.code = 'ER_DUP_ENTRY';
    if (issue === 'wrong errno') observed.errno = 1213;
    if (issue === 'wrong state') observed.sqlState = '40001';
    if (issue === 'not user lock') observed.userLockSql = false;
    await expect(lookup(Users, transaction())).rejects.toThrow('genuine rolled-back');
    expect(blocker.rollback).not.toHaveBeenCalled();
  }
);

test('blocker connection cannot also serve as an endpoint attempt connection', async () => {
  await expect(lookup(Users, { ...transaction(), connection: blocker.connection }))
    .rejects.toThrow('distinct active');
  expect(sequelize.query).not.toHaveBeenCalled();
});

test('transaction reuse is rejected instead of mistaken for a fresh retry', async () => {
  const first = transaction();
  await expect(lookup(Users, first)).rejects.toBe(failure);
  await expect(lookup(Users, first)).rejects.toThrow('reused');
  expect(blocker.rollback).not.toHaveBeenCalled();
});

test('unrelated user reads and unlocked reads are not instrumented', async () => {
  await hook({ where: { id: 99 }, transaction: transaction(), lock: 'UPDATE' });
  await hook({ where: { id: 22 }, transaction: transaction() });
  expect(observer.attempts).toEqual([]);
  expect(sequelize.query).not.toHaveBeenCalled();
});

test('dispose restores original lookup and removes only the named hook', () => {
  observer.dispose();
  expect(Users.findByPk).toBe(original);
  expect(Users.removeHook).toHaveBeenCalledWith('beforeFind', Users.addHook.mock.calls[0][1]);
});

test('SQL recognition does not accept a timeout in session setup as a locking-read failure', async () => {
  failure.sql = 'SET SESSION innodb_lock_wait_timeout = 1';
  sequelize.query.mockRejectedValueOnce(failure);
  const first = transaction();
  await expect(lookup(Users, first)).rejects.toBe(failure);
  expect(observer.attempts[0].error.userLockSql).toBe(false);
  first.finished = 'rollback';
  await expect(lookup(Users, transaction())).rejects.toThrow('genuine rolled-back');
});


test('exhaustion mode observes every genuine failure without releasing or capping attempts', async () => {
  observer.dispose();
  observer = installRecovery(sequelize, Users, 22, blocker, { holdUntilExhausted: true });
  original.mockImplementation(async (id, options) => {
    await hook({ ...options, where: { id } });
    throw failure;
  });
  // Include a fourth call to prove instrumentation cannot enforce the route's
  // three-attempt budget and accidentally make the integration assertion pass.
  for (let index = 0; index < 4; index++) {
    const tx = transaction();
    await expect(lookup(Users, tx)).rejects.toBe(failure);
    expect(observer.attempts[index].error.errno).toBe(1205);
    tx.finished = 'rollback';
  }
  expect(observer.attempts).toHaveLength(4);
  expect(sequelize.query).toHaveBeenCalledTimes(4);
  expect(blocker.rollback).not.toHaveBeenCalled();
});

test('exhaustion mode refuses to proceed if the blocker was released between attempts', async () => {
  observer.dispose();
  observer = installRecovery(sequelize, Users, 22, blocker, { holdUntilExhausted: true });
  const first = transaction();
  await expect(lookup(Users, first)).rejects.toBe(failure);
  first.finished = 'rollback';
  blocker.finished = 'rollback';
  await expect(lookup(Users, transaction())).rejects.toThrow('remain active');
  expect(blocker.rollback).not.toHaveBeenCalled();
});
