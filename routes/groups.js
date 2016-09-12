const debug = require('debug')('calendar-server:routes/groups');
const express = require('express');

const groups = require('../dao/groups');
const { NotFoundError, ForbiddenError } = require('../utils/errors');

const router = express.Router();

function notFoundError(id) {
  return NotFoundError.createWithSubject('user', { name: 'id', value: id });
}

function checkLoggedUserInGroup(req, res, next) {
  const loggedId = req.user.id;
  const requestedGroup = +req.params.id;
  debug(
    'checkLoggedUserInGroup(loggedId=%s, requestedGroup=%s)',
    loggedId, requestedGroup
  );

  groups.isUserInGroup(requestedGroup, loggedId)
    .then(inGroup => {
      debug('  -> ', inGroup);
      if (inGroup) {
        next();
      } else {
        next(notFoundError(requestedGroup));
      }
    })
    .catch(next);
}

function checkLoggedUserAdmin(req, res, next) {
  const loggedId = req.user.id;
  const requestedGroup = +req.params.id;

  debug(
    'checkLoggedUserAdmin(loggedId=%s, requestedGroup=%s)',
    loggedId, requestedGroup
  );

  groups.isUserAdminInGroup(requestedGroup, loggedId)
    .then(isAdmin => {
      debug('  -> ', isAdmin);
      if (isAdmin) {
        next();
      } else {
        next(new ForbiddenError(
          'not_admin',
          'The logged in user is not an admin for this group'
        ));
      }
    });
}

function checkGroupExists(req, res, next) {
  const requestedId = req.params.id;
  debug('checkGroupExists(requestedId=%s)', requestedId);

  groups.get(requestedId).then(
    () => next(),
    next
  );
}

router.post('/', (req, res, next) => {
  groups.create(req.body)
    .then((id) => groups.get(id))
    .then((group) => {
      debug('group #%s is: %o', group.id, group);

      // adding user to group as admin
      return groups.addUserToGroup(group.id, req.user.id, /* isAdmin */ true)
        .then(() => {
          res
            .status(201)
            .location(`${req.baseUrl}/${group.id}`)
            .send(group);
        });
    })
    .catch(next);
});

router.get('/:id(\\d+)',
  checkGroupExists,
  checkLoggedUserInGroup,
  (req, res, next) => {
    groups.get(+req.params.id)
      .then(group => res.send(group))
      .catch(next);
  }
);

router.put('/:id(\\d+)/members/:userId(\\d+)',
  checkGroupExists,
  checkLoggedUserInGroup,
  checkLoggedUserAdmin,
  (req, res, next) => {
    const group = +req.params.id;
    const user = +req.params.userId;

    groups.isUserInGroup(group, user)
      .then(inGroup => {
        if (inGroup) {
          res.status(409).end();
        } else {
          groups.addUserToGroup(group, user)
            .then(() => res.status(204).end());
        }
      })
      .catch(next);
  }
);


module.exports = router;
