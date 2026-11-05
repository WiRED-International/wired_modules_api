const installOverlap = require('./integration/cmeTransactionOverlap');
let Users;
let hook;
let barrier;
const tx = () => ({ connection: {}, finished: undefined });
const options = transaction => ({ transaction, where: { id: 22 }, lock: 'UPDATE' });

beforeEach(() => {
  jest.useFakeTimers();
  Users = { addHook: jest.fn((type, name, callback) => { hook = callback; }), removeHook: jest.fn() };
  barrier = installOverlap(Users, 22, 1000);
});
afterEach(() => { barrier.dispose(); jest.useRealTimers(); });

test('holds the first active transaction until a second distinct transaction arrives', async () => {
  let firstReleased = false;
  const first = hook(options(tx())).then(() => { firstReleased = true; });
  await Promise.resolve();
  expect(firstReleased).toBe(false);
  const second = hook(options(tx()));
  await Promise.all([first, second]);
  expect(firstReleased).toBe(true);
  expect(() => barrier.verify()).not.toThrow();
  expect(jest.getTimerCount()).toBe(0);
});

test('unrelated users, unlocked reads and nontransactional reads do not count', async () => {
  await hook({ ...options(tx()), where: { id: 99 } });
  await hook({ ...options(tx()), lock: undefined });
  await hook({ where: { id: 22 }, lock: 'UPDATE' });
  expect(() => barrier.verify()).toThrow('not demonstrated');
  expect(jest.getTimerCount()).toBe(0);
  await Promise.all([hook(options(tx())), hook(options(tx()))]);
  expect(() => barrier.verify()).not.toThrow();
});

test('the same transaction cannot satisfy the overlap barrier twice', async () => {
  const transaction = tx();
  const first = hook(options(transaction));
  await hook(options(transaction));
  expect(() => barrier.verify()).toThrow('not demonstrated');
  await Promise.all([first, hook(options(tx()))]);
  expect(() => barrier.verify()).not.toThrow();
});

test('different transaction objects sharing one connection are rejected', async () => {
  const first = tx();
  await Promise.all([hook(options(first)), hook(options({ connection: first.connection }))]);
  expect(() => barrier.verify()).toThrow('not demonstrated');
});

test('already finished transactions cannot establish active overlap', async () => {
  await Promise.all([hook(options({ ...tx(), finished: 'commit' })), hook(options(tx()))]);
  expect(() => barrier.verify()).toThrow('not demonstrated');
});

test('missing second arrival times out explicitly and releases the waiting request', async () => {
  const outcomes = Promise.allSettled([hook(options(tx()))]);
  jest.advanceTimersByTime(1000);
  const result = await outcomes;
  expect(result[0].status).toBe('rejected');
  expect(result[0].reason.message).toContain('did not reach');
  expect(() => barrier.verify()).toThrow('not demonstrated');
});

test('disposal removes only the named test hook and releases a pending arrival', async () => {
  const pending = hook(options(tx()));
  barrier.dispose();
  await pending;
  expect(Users.removeHook).toHaveBeenCalledWith('beforeFind', Users.addHook.mock.calls[0][1]);
  expect(jest.getTimerCount()).toBe(0);
});

test('later retry attempts pass through after the first pair is released', async () => {
  await Promise.all([hook(options(tx())), hook(options(tx()))]);
  await hook(options(tx()));
  expect(() => barrier.verify()).not.toThrow();
  expect(jest.getTimerCount()).toBe(0);
});
