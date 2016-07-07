const debug = require('debug')('calendar-server:login');
const jwt = require('jsonwebtoken');

const config = require('../config');
const { UnauthorizedError } = require('../utils/errors');

/**
 * @param {String} req.body.user Authenticating user
 * @param {String} req.body.password Password for this user
 * @returns {Void}
 */
module.exports = function login(req, res, next) {
  debug('login with credentials %o', req.body);
  const { user, password } = req.body;

  // Wow much secure very safe
  // FIXME with a real user database
  if (password === 'password') {
    const token = jwt.sign(
      { family: user }, config.authenticationSecret, { expiresIn: '30d' }
    );
    res.send({ token });
  } else {
    debug('Bad creds specified: user=`%s`, password=`%s`', user, password);
    next(new UnauthorizedError(
      'invalid_credentials', 'Invalid credentials were specified'
    ));
  }
};
