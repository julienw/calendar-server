const debug = require('debug')('DEBUG:calendar-server:routes/reminders');
const express = require('express');

const users = require('../dao/users');
const groups = require('../dao/groups');
const {
  DuplicateUserError, NotFoundError, ForbiddenError
} = require('../utils/errors');

const router = express.Router();

function notFoundError(id) {
  return NotFoundError.createWithSubject('user', { name: 'id', value: id });
}

function checkIsLoggedInUser(req, res, next) {
  const loggedId = req.user.id;
  const requestedId = +req.params.id;

  if (loggedId !== requestedId) {
    next(notFoundError(requestedId));
    return;
  }
  next();
}

function checkUserExists(req, res, next) {
  const requestedId = +req.params.id;

  users.getById(requestedId).then(
    () => next(),
    next
  );
}

router.post('/', (req, res, next) => {
  if (!req.user || !req.user.isMaster) {
    next(new ForbiddenError(
      'forbidden',
      `You're not allowed to create users.`
    ));
  }
  users.create(req.body).then((id) => {
    debug('User #%s has been created in database', id);

    return users.getById(id);
  }).then((user) => {
    debug('User #%s is: %o', user.id, user);

    delete user.phoneNumber; // useless information here
    res
      .status(201)
      .location(`${req.baseUrl}/${user.id}`)
      .send(user);
  }).catch(e => {
    if (e.code === 'SQLITE_CONSTRAINT' && e.message.includes('UNIQUE')) {
      e = new DuplicateUserError(
        'duplicate_username',
        'This username is already taken, please choose another one.'
      );
    }
    next(e);
  });
});

router.route('/:id(\\d+)')
  .get((req, res, next) => {
    const requestedId = +req.params.id;

    function checkRights() {
      const loggedId = req.user.id;

      if (loggedId === requestedId) {
        return Promise.resolve();
      }

      return groups.getCommonGroups(loggedId, requestedId)
        .then(groups => {
          if (!groups.length) {
            console.error(
              'User %d tried to get information for user %d ' +
              'but has no common groups',
              loggedId, requestedId
            );
            throw notFoundError(requestedId);
          }
        });
    }

    checkRights()
      .then(() => users.getById(requestedId))
      .then((user) => {
        debug('Found user %o', user);
        res.send(user);
      }).catch(next);
  })
  .delete(
    checkIsLoggedInUser,
    (req, res, next) => {
      const requestedId = +req.params.id;

      const currentPassword = req.body.currentPassword;
      users.getById(requestedId)
        .then(user => users.authenticate(user.passwordHash, currentPassword))
        .then(isCorrect => {
          if (isCorrect) {
            return users.delete(requestedId);
          }
          throw new ForbiddenError(
            'password_incorrect',
            'The password supplied in `currentPassword` is incorrect'
          );
        }).then(() => res.status(204).end())
        .catch(next);
    }
  )
  .patch((req, res, _next) => {
    // TODO implement this
  });

router.get(
  '/:id(\\d+)/groups',
  checkUserExists,
  checkIsLoggedInUser,
  function(req, res, next) {
    const requestedId = +req.params.id;
    users.getGroupsForUser(requestedId)
      .then((result) => res.send(result))
      .catch(next);
  }
);

router.get(
  '/:id(\\d+)/relations',
  checkUserExists,
  checkIsLoggedInUser,
  function(req, res, next) {
    const requestedId = +req.params.id;
    users.getRelationsForUser(requestedId)
      .then((result) => res.send(result)) // TODO remove passwords
      .catch(next);
  }
);

module.exports = router;
