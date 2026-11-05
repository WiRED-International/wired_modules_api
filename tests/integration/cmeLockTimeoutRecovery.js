'use strict';

const { randomUUID } = require('crypto');

function installLockTimeoutRecovery(sequelize, Users, userId, blocker, { holdUntilExhausted = false } = {}) {
  const name = `cme-timeout-${randomUUID()}`;
  const descriptor = Object.getOwnPropertyDescriptor(Users, 'findByPk');
  const original = Users.findByPk;
  const attempts = [];

  // Observer only: invoke the original method and rethrow the original error.
  // This does not replace SQL, transactions, locks, or driver errors.
  Users.findByPk = async function (id, options = {}) {
    const target = id === userId && options.transaction && options.lock === 'UPDATE';
    try {
      return await original.call(this, id, options);
    } catch (error) {
      const attempt = target && attempts.find(item => item.transaction === options.transaction);
      if (attempt) {
        const driver = error.parent || error.original || {};
        const sql = error.sql || driver.sql || '';
        attempt.error = { code: driver.code, errno: driver.errno, sqlState: driver.sqlState,
          userLockSql: /FROM\s+`users`/i.test(sql) && /FOR UPDATE/i.test(sql) };
      }
      throw error;
    }
  };

  Users.addHook('beforeFind', name, async options => {
    if (options.where?.id !== userId || !options.transaction || options.lock !== 'UPDATE') return;
    const transaction = options.transaction;
    if (!transaction.connection || transaction.connection === blocker.connection || transaction.finished) {
      throw new Error('Timeout scenario requires a distinct active endpoint connection.');
    }
    if (attempts.some(attempt => attempt.transaction === transaction)) {
      throw new Error('Timeout scenario unexpectedly reused an attempt transaction.');
    }
    const attempt = { transaction, connection: transaction.connection };
    attempts.push(attempt);
    if (!holdUntilExhausted && attempts.length > 2) throw new Error('Timeout scenario exceeded the expected two attempts.');
    if (attempts.length > 1) {
      const previous = attempts[attempts.length - 2];
      const failure = previous.error;
      if (failure?.code !== 'ER_LOCK_WAIT_TIMEOUT' || failure.errno !== 1205 ||
          failure.sqlState !== 'HY000' || !failure.userLockSql ||
          previous.transaction.finished !== 'rollback' ||
          previous.transaction === transaction) {
        throw new Error('A genuine rolled-back MySQL user-lock timeout was not observed.');
      }
      // Event-driven: release only after the route has rolled back the failed
      // attempt and started its fresh retry, before that retry's locking SELECT.
      if (!holdUntilExhausted) {
        await blocker.rollback();
        attempt.blockerReleased = blocker.finished === 'rollback';
      } else if (blocker.finished) {
        throw new Error('Exhaustion scenario requires the blocker to remain active.');
      }
    }
    // Apply to every endpoint attempt on its own pinned connection. These
    // isolated test-pool sessions must be closed after this scenario.
    await sequelize.query('SET SESSION innodb_lock_wait_timeout = 1', { transaction });
    attempt.timeoutConfigured = true;
  });

  return {
    attempts,
    dispose() {
      Users.removeHook('beforeFind', name);
      if (descriptor) Object.defineProperty(Users, 'findByPk', descriptor);
      else delete Users.findByPk;
    },
  };
}

module.exports = installLockTimeoutRecovery;
