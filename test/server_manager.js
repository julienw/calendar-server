const spawn = require('child_process').spawn;
const path = require('path');
const tcpPortUsed = require('tcp-port-used');

const entryPoint = path.join(__dirname, '../app.js');

let handler;

module.exports = {
  start() {
    handler = spawn('node', [entryPoint]);
    // FIXME: Make port parameterized
    const port = 3000;
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
