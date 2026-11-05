'use strict';

const path = require('path');
const connectionPath = require.resolve('../../config/connection');
const root = path.resolve(__dirname, '../..');
const applicationDirectories = ['models', 'controllers', 'services']
  .map(directory => path.join(root, directory) + path.sep);

// Refuse to rebind models or services that were initialized on another instance.
if (Object.keys(require.cache).some(filename => filename === connectionPath ||
    applicationDirectories.some(directory => filename.startsWith(directory)))) {
  throw new Error('CME integration connection setup must run before application imports.');
}

const createCmeTestConnection = require('./createCmeTestConnection');
const connection = createCmeTestConnection();

// Register before the first application import. All relative imports resolving
// to this module receive the same instance; the runtime module is never run.
jest.doMock(connectionPath, () => connection);
