const debug = require('debug')('calendar-server:routes/reminders');
const express = require('express');

const reminders = require('../dao/reminders');

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

  operationPromise.then(
    rows => res.send(rows)
  ).catch(next);
});

router.post('/', (req, res, next) => {
  const newReminder = req.body;
  newReminder.recipients.forEach(recipient => {
    if (recipient.userId === 'myself') {
      recipient.userId = +req.user.id;
    }
  });
  reminders.create(newReminder).then((id) => {
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
  .get((req, res, next) => {
    reminders.show(req.params.id).then((reminder) => {
      debug('Found reminder %o', reminder);
      res.send(reminder);
    }).catch(next);
  })
  .delete((req, res, next) => {
    // TODO do not delete if there is more than 1 recipient
    reminders.delete(req.user.id, req.params.id)
      .then(() => res.status(204).end())
      .catch(next);
  })
  .put((req, res, next) => {
    const id = req.params.id;

    reminders.update(id, req.body).then(() => {
      debug('Reminder #%s has been updated in database', id);

      return reminders.show(id);
    }).then((reminder) => {
      debug('Reminder #%s has been updated: %o', id, reminder);
      res.send(reminder);
    }).catch(next);
  });

router.get('/:id(\\d+)/recipients', function(req, res, next) {
  reminders.getRecipients(req.params.id)
    .then(recipients => res.send(recipients))
    .catch(next);
});

module.exports = router;
