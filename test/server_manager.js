const spawn = require('child_process').spawn;
const path = require('path');
const rimraf = require('rimraf');
const tcpPortUsed = require('tcp-port-used');

const entryPoint = path.join(__dirname, '../app.js');

let handler;

const httpPort = 3001;
const mqPort = 4001;
module.exports = {
  httpPort,
  mqPort,
  start() {
    rimraf.sync('profiles/test');

    handler = spawn(
      'node',
      [ entryPoint,
        '--httpPort', httpPort,
        '--profile', 'profiles/test',
        '--mqPort', mqPort,
        '--notificationPoll', '1',
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

  inject() {
    const chakram = require('chakram');
    const config = require('./config');

    const self = this;

    beforeEach(function*() {
      yield self.start();
      const res = yield chakram.post(
        `${config.apiRoot}/login`,
        { user: 'family_name', password: 'password' }
      );
      chakram.setRequestDefaults({
        headers: {
          Authorization: `Bearer ${res.body.token}`
        }
      });
    });

    afterEach(function*() {
      chakram.clearRequestDefaults();
      yield self.stop();
    });
  },
};
