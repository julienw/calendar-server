const debug = require('debug')('DEBUG:calendar-server:routes/groups');
const express = require('express');

const groupsDao = require('../dao/groups');
const remindersDao = require('../dao/reminders');
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

  groupsDao.isUserInGroup(requestedGroup, loggedId)
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

  groupsDao.isUserAdminInGroup(requestedGroup, loggedId)
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

  groupsDao.get(requestedId).then(
    () => next(),
    next
  );
}

router.post('/', (req, res, next) => {
  groupsDao.create(req.body)
    .then((id) => groupsDao.get(id))
    .then((group) => {
      debug('group #%s is: %o', group.id, group);

      // adding user to group as admin
      return groupsDao.addUserToGroup(group.id, req.user.id, /* isAdmin */ true)
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
    groupsDao.get(+req.params.id)
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

    groupsDao.isUserInGroup(group, user)
      .then(inGroup => {
        if (inGroup) {
          res.status(409).end();
        } else {
          groupsDao.addUserToGroup(group, user)
            .then(() => res.status(204).end());
        }
      })
      .catch(next);
  }
);

router.get('/:id(\\d+)/reminders',
  checkGroupExists,
  checkLoggedUserInGroup,
  (req, res, next) => {
    const groupId = +req.params.id;
    const start = parseInt(req.query.start);
    let limit = parseInt(req.query.limit);

    if (Number.isNaN(limit)) {
      limit = 20;
    }

    let promise;
    if (Number.isNaN(start)) {
      promise = remindersDao.getAllForGroupByStatus(groupId, 'waiting', limit);
    } else {
      promise = remindersDao.getAllForGroupByStart(groupId, start, limit);
    }
    promise
      .then(reminders => {
        const promises = reminders.map(reminder =>
          remindersDao.getRecipients(reminder.id)
            .then(recipients => {
              reminder.recipients = recipients.map(
                recipient => ({
                  id: recipient.id,
                  forename: recipient.forename,
                })
              );
            })
        );
        return Promise.all(promises).then(() => reminders);
      })
      .then(reminders => res.send(reminders))
      .catch(next);
  }
);

module.exports = router;
