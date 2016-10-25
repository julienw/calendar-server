const debug = require('debug')('calendar-server:routes/reminders');
const express = require('express');

const reminders = require('../dao/reminders');
const groupsDao = require('../dao/groups');
const { NotFoundError, ForbiddenError } = require('../utils/errors');

function notFoundError(id) {
  return NotFoundError.createWithSubject('reminder', { name: 'id', value: id });
}

function checkLoggedUserCanAccessReminder(req, res, next) {
  const loggedId = req.user.id;
  const requestedReminder = +req.params.id;

  debug(
    'checkLoggedUserCanAccessReminder(loggedId=%s, requestedReminder=%s)',
    loggedId, requestedReminder
  );

  // TODO try to do this using one SQL request
  reminders.getRecipients(requestedReminder)
    .then(recipients =>
      Promise.all(
        recipients.map(
          recipient => groupsDao.getCommonGroups(recipient.id, loggedId)
        )
      )
    )
    .then(groups => groups.some(group => group.length))
    .then(hasCommonGroups => {
      debug('  -> ', hasCommonGroups);
      if (hasCommonGroups) {
        next();
      } else {
        next(notFoundError(requestedReminder));
      }
    });
}

function checkLoggedUserIsAdmin(req, res, next) {
  const loggedId = req.user.id;
  const requestedReminder = +req.params.id;

  debug(
    'checkLoggedUserIsAdmin(loggedId=%s, requestedReminder=%s)',
    loggedId, requestedReminder
  );

  // TODO try to do this using one SQL request
  reminders.getRecipients(requestedReminder)
    .then(recipients =>
      Promise.all(
        recipients.map(
          recipient => groupsDao.getCommonGroups(recipient.id, loggedId)
        )
      )
    )
    .then(groupsArray => {
      const uniqueGroups = new Set();
      groupsArray.forEach(
        groups => groups.forEach(group => uniqueGroups.add(group))
      );

      return Promise.all(
        [...uniqueGroups].map(
          group => groupsDao.isUserAdminInGroup(group, loggedId)
        )
      );
    })
    .then(isAdminResults => isAdminResults.some(isAdmin => isAdmin))
    .then(isAdmin => {
      debug('  -> ', isAdmin);
      if (isAdmin) {
        next();
      } else {
        next(new ForbiddenError(
          'not_admin',
          'The logged in user is not admin for one of the corresponding groups.'
        ));
      }
    });
}

function checkAllRecipientsShareCommonGroupWithUser(recipients, loggedId) {
  return Promise.all(recipients.map(
    recipient => groupsDao.getCommonGroups(recipient.id, loggedId)
  ))
    .then(commonGroupsArray =>
      commonGroupsArray.every(commonGroups => commonGroups.length)
    )
    .then(hasCommonGroups => {
      if (!hasCommonGroups) {
        throw new ForbiddenError(
          'no_common_group',
          'You need to have a common group with every recipient.'
        );
      }
    });
}


const router = express.Router();

router.get('/', (req, res, next) => {
  const start = parseInt(req.query.start);
  let limit = parseInt(req.query.limit);
  const userId = req.user.id;

  if (Number.isNaN(limit)) {
    limit = 20;
  }

  let operationPromise;
  if (Number.isNaN(start)) {
    operationPromise =
      reminders.getAllForUserByStatus(userId, 'waiting', limit);
  } else {
    operationPromise = reminders.getAllForUserByStart(userId, start, limit);
  }

  operationPromise
    .then(rows => {
      const promises = rows.map(row =>
        reminders.getRecipients(row.id)
          .then(recipients => {
            row.recipients = recipients.map(
              recipient => ({ id: recipient.id, forename: recipient.forename })
            );
          })
      );
      return Promise.all(promises).then(() => rows);
    })
    .then(
      rows => res.send(rows)
    )
    .catch(next);
});

router.post('/', (req, res, next) => {
  const newReminder = req.body;
  const loggedId = +req.user.id;

  newReminder.recipients.forEach(recipient => {
    if (recipient.id === 'myself') {
      recipient.id = loggedId;
    }
  });

  // Check that all recipients share a common group with the logged in user.
  checkAllRecipientsShareCommonGroupWithUser(newReminder.recipients, loggedId)
    .then(() => reminders.create(newReminder))
    .then((id) => {
      debug('Reminder #%s has been created in database', id);

      return reminders.show(id);
    }).then((reminder) => {
      debug('Reminder #%s is: %o', reminder.id, reminder);
      res
        .status(201)
        .location(`${req.baseUrl}/${reminder.id}`)
        .send(reminder);
    }).catch(next);
});

// TODO add permission checks
router.route('/:id(\\d+)')
  .all(checkLoggedUserCanAccessReminder)
  .get((req, res, next) => {
    reminders.show(req.params.id).then((reminder) => {
      debug('Found reminder %o', reminder);
      res.send(reminder);
    }).catch(next);
  })
  .delete(
    checkLoggedUserIsAdmin,
    (req, res, next) => {
      reminders.delete(req.params.id)
        .then(() => res.status(204).end())
        .catch(next);
    }
  )
  .put((req, res, next) => {
    const id = +req.params.id;

    const newReminder = req.body;
    const loggedId = +req.user.id;

    newReminder.recipients.forEach(recipient => {
      if (recipient.id === 'myself') {
        recipient.id = loggedId;
      }
    });

    // Check that all recipients share a common group with the logged in user.
    checkAllRecipientsShareCommonGroupWithUser(newReminder.recipients, loggedId)
      .then(() => reminders.update(id, req.body))
      .then(() => {
        debug('Reminder #%s has been updated in database', id);

        return reminders.show(id);
      })
      .then((reminder) => {
        debug('Reminder #%s has been updated: %o', id, reminder);
        res.send(reminder);
      })
      .catch(next);
  })
  .patch((req, res, next) => {
    const id = +req.params.id;

    reminders.updatePartial(id, req.body)
      .then(() => {
        debug('Reminder #%s has been updated in database', id);

        return reminders.show(id);
      })
      .then((reminder) => {
        debug('Reminder #%s has been updated: %o', id, reminder);
        res.send(reminder);
      })
      .catch(next);
  });

router.get('/:id(\\d+)/recipients',
  checkLoggedUserCanAccessReminder,
  (req, res, next) => {
    reminders.getRecipients(req.params.id)
      .then(recipients => res.send(recipients))
      .catch(next);
  }
);

router.delete('/:id(\\d+)/recipients/:userId(\\d+)',
  checkLoggedUserCanAccessReminder,
  (req, res, next) => {
    const userId = +req.params.userId;
    if (userId !== req.user.id) {
      next(new ForbiddenError(
        'not_myself',
        'A recipient can only be deleted by oneself.'
      ));
      return;
    }
    const reminderId = +req.params.id;

    reminders.deleteRecipient(reminderId, userId)
      .then(() => reminders.getRecipients(reminderId))
      .then((recipients) =>
        (recipients.length ? Promise.resolve() : reminders.delete(reminderId))
      )
      .then(() => res.status(204).end())
      .catch(next);
  }
);

module.exports = router;
