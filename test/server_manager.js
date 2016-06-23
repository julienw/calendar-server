const spawn = require('child_process').spawn;
const path = require('path');
const rimraf = require('rimraf');
const tcpPortUsed = require('tcp-port-used');

const entryPoint = path.join(__dirname, '../app.js');

let handler;

const port = 3001;
module.exports = {
  port,
  start() {
    rimraf.sync('profiles/test');

    handler = spawn(
      'node',
      [ entryPoint, '--port', port, '--profile', 'profiles/test' ],
      { stdio: 'inherit' }
    );

    const timeBetweenRetriesInMs = 500;
    const timeOutInMs = 5000;
    return tcpPortUsed.waitUntilUsed(port, timeBetweenRetriesInMs, timeOutInMs);
  },

  stop() {
    return new Promise(resolve => {
      handler.on('exit', () => resolve());
      handler.kill();
    });
  }
};
