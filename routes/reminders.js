const debug = require('debug')('calendar-server:routes/reminders');

const reminders = require('../reminders');

function removeFamilyProperty(item) {
  delete item.family;
  return item;
}

function addRoutes(app, apiRoot) {
  app.route(`${apiRoot}/reminders`)
    .get((req, res, next) => {
      reminders.index(req.user.family, req.query.start, req.query.limit)
        .then(rows => {
          // We don't want to expose the family in the API result
          res.send(rows.map(removeFamilyProperty));
        }).catch(next);
    })
    .post((req, res, next) => {
      reminders.create(req.user.family, req.body).then((id) => {
        debug('reminder with ID %s has been created in database', id);
        res.status(201).location(`${apiRoot}/reminders/${id}`).end();
      }).catch(next);
    });

  app.route(`${apiRoot}/reminders/:reminder`)
    .get((req, res, next) => {
      reminders.show(req.user.family, req.params.reminder).then((reminder) => {
        debug('found reminder %o', reminder);
        res.send(removeFamilyProperty(reminder));
      }).catch(next);
    })
    .delete((req, res, next) => {
      reminders.delete(req.user.family, req.params.reminder)
        .then(() => res.status(204).end())
        .catch(next);
    })
    .put((req, res, next) => {
      reminders.update(req.user.family, req.params.reminder, req.body)
        .then(() => res.status(204).end())
        .catch(next);
    });
}

module.exports = addRoutes;
