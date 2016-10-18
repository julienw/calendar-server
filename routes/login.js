const debug = require('debug')('calendar-server:routes/login');
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
      const token = jwt.sign(
        { id: user.id }, config.authenticationSecret, { expiresIn: '30d' }
      );
      res.send({ token });
    })
    .catch(err => {
      debug('Error while login:', err);
      // generic authentication error so that we don't disclose anything
      // specific
      next(new UnauthorizedError(
        'invalid_credentials', 'Invalid credentials were specified'
      ));
    });
};
