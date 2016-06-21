const debug = require('debug')('calendar-server:login');

const jwt = require('jsonwebtoken');

const secret = 'some secret that you should configure';

/**
 * @param {String} req.body.user Authenticating user
 * @param {String} req.body.password Password for this user
 * @returns {Void}
 */
module.exports = function login(req, res) {
  const { user, password } = req.body;
  debug('login %s %s', user, password);

  if (user === 'root' && password === 'password') {
    const token = jwt.sign({ user }, secret, { expiresIn: '30d' });
    res.send({ token });
  } else {
    res.status(401).send({ error: 'UnauthorizedError' });
  }
};
