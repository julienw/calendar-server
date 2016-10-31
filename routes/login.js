const debug = require('debug')('DEBUG:calendar-server:routes/login');
const log = require('debug')('LOG:calendar-server:routes/login');
const jwt = require('jsonwebtoken');

const users = require('../dao/users');

const config = require('../config');
const { UnauthorizedError } = require('../utils/errors');

/**
 * @param {String} req.body.username Authenticating user
 * @param {String} req.body.password Password for this user
 * @returns {void}
 */
module.exports = function login(req, res, next) {
  const { username, password } = req.body;

  debug('login with credentials %o', { username, password: 'XXX' });

  users.authenticate(username, password)
    .then(user => {
      debug('Authentication successful: user=%o', user);
      const userInfo = { id: user.id };
      if (username === 'master') {
        userInfo.isMaster = true;
      }

      const token = jwt.sign(
        userInfo, config.authenticationSecret, { expiresIn: '365d' }
      );
      res.send({ token });
    })
    .catch(err => {
      log('Error while login for user `%s`:', username, err);
      // generic authentication error so that we don't disclose anything
      // specific
      next(new UnauthorizedError(
        'invalid_credentials', 'Invalid credentials were specified'
      ));
    });
};
