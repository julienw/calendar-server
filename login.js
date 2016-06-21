const debug = require('debug')('calendar-server:login');

const jwt = require('jsonwebtoken');

const { UnauthorizedError } = require('./errors');

const secret = 'some secret that you should configure';

/**
 * @param {String} req.body.user Authenticating user
 * @param {String} req.body.password Password for this user
 * @returns {Void}
 */
module.exports = function login(req, res, next) {
  const { user, password } = req.body;

  if (user === 'root' && password === 'password') {
    const token = jwt.sign({ user }, secret, { expiresIn: '30d' });
    res.send({ token });
  } else {
    debug('Bad user/password specified: user=%s, password=%s', user, password);
    next(new UnauthorizedError(
      'invalid_credentials', 'Invalid credentials were specified'
    ));
  }
};
