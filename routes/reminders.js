const debug = require('debug')('calendar-server:routes/reminders');
const express = require('express');

const reminders = require('../dao/reminders');

const router = express.Router();

function removeFamilyProperty(item) {
  delete item.family;
  return item;
}

router.get('/', (req, res, next) => {
  reminders.index(req.user.family, req.query.start, req.query.limit)
  .then(rows => {
    // We don't want to expose the family in the API result
    res.send(rows.map(removeFamilyProperty));
  }).catch(next);
});

router.post('/', (req, res, next) => {
  reminders.create(req.user.family, req.body).then((id) => {
    debug('reminder with ID %s has been created in database', id);
    res.status(201).location(`${req.baseUrl}/${id}`).end();
  }).catch(next);
});

router.route('/:id')
  .get((req, res, next) => {
    reminders.show(req.user.family, req.params.id).then((reminder) => {
      debug('found reminder %o', reminder);
      res.send(removeFamilyProperty(reminder));
    }).catch(next);
  })
  .delete((req, res, next) => {
    reminders.delete(req.user.family, req.params.id)
      .then(() => res.status(204).end())
      .catch(next);
  })
  .put((req, res, next) => {
    reminders.update(req.user.family, req.params.id, req.body)
      .then(() => res.status(204).end())
      .catch(next);
  });

module.exports = router;
