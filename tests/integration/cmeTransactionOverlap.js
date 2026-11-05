'use strict';

const { randomUUID } = require('crypto');

function installCmeTransactionOverlap(Users, userId, timeoutMs = 10000) {
  const name = `cme-overlap-${randomUUID()}`;
  const arrivals = [];
  let release;
  let timer;
  let failure;
  let released = false;
  const gate = new Promise(resolve => { release = resolve; });
  function finish() {
    released = true;
    clearTimeout(timer);
    release();
  }
  Users.addHook('beforeFind', name, async options => {
    const transaction = options.transaction;
    if (options.where?.id !== userId || options.lock !== 'UPDATE' || !transaction || released) return;
    if (arrivals.some(arrival => arrival.transaction === transaction)) return;
    arrivals.push({ transaction, connection: transaction.connection, finished: transaction.finished });
    if (arrivals.length === 1) {
      // A failure bound only, not a sleep used to manufacture concurrency.
      timer = setTimeout(() => {
        failure = 'Both CME transactions did not reach the overlap barrier.';
        finish();
      }, timeoutMs);
    }
    if (arrivals.length === 2) finish();
    await gate;
    if (failure) throw new Error(failure);
  });
  return {
    verify() {
      if (failure || arrivals.length !== 2 || arrivals.some(arrival =>
        !arrival.connection || arrival.finished) ||
        arrivals[0].transaction === arrivals[1].transaction ||
        arrivals[0].connection === arrivals[1].connection) {
        throw new Error('Two active CME transactions on distinct connections were not demonstrated.');
      }
    },
    dispose() {
      Users.removeHook('beforeFind', name);
      finish();
    },
  };
}

module.exports = installCmeTransactionOverlap;
