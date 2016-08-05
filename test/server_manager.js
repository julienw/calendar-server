const spawn = require('child_process').spawn;
const path = require('path');
const rimraf = require('rimraf');
const tcpPortUsed = require('tcp-port-used');
const mkdirp = require('mkdirp');

const config = require('./config');

const entryPoint = path.join(__dirname, '../app.js');

let handler;

const httpPort = config.httpPort;
const mqPort = config.mqPort;
const profilePath = config.profilePath;

module.exports = {
  reinitProfile() {
    rimraf.sync(profilePath);
    mkdirp.sync(profilePath);
  },
  start() {
    this.reinitProfile();

    handler = spawn(
      'node',
      [ entryPoint,
        '--httpPort', httpPort,
        '--profile', profilePath,
        '--mqPort', mqPort,
        '--notificationPoll', '1000',
      ],
      { stdio: 'inherit' }
    );

    const timeBetweenRetriesInMs = 500;
    const timeOutInMs = 5000;
    return tcpPortUsed.waitUntilUsed(
      httpPort, timeBetweenRetriesInMs, timeOutInMs
    );
  },

  stop() {
    return new Promise(resolve => {
      handler.on('exit', () => resolve());
      handler.kill();
    });
  },
};
