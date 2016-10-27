const debug = require('debug')('DEBUG:calendar-server:routes/subscriptions');

const express = require('express');
const subscriptions = require('../dao/subscriptions');
const { DuplicateEndpointError, NotFoundError } = require('../utils/errors');

const router = express.Router();

function hidePrivateData(item) {
  delete item.subscription.keys.auth;
  delete item.userId;
  return item;
}

router.post('/', function(req, res, next) {
  const userId = req.user.id;

  const endpoint = req.body.subscription.endpoint;
  subscriptions.findByEndpoint(userId, endpoint).then((subscription) => {
    // This endpoint is already in the DB
    throw new DuplicateEndpointError( // will generate a status "409 Conflict"
      'duplicate_endpoint',
      `A subscription with endpoint "${endpoint}" is already registered.`,
      hidePrivateData(subscription)
    );
  },
  (err) => {
    if (!(err instanceof NotFoundError)) {
      throw err;
    }

    // This endpoint does not exist yet, let's create it

    return subscriptions.create(userId, req.body).then((id) => {
      debug('Subscription #%s has been created in database', id);

      return subscriptions.show(userId, id);
    }).then((subscription) => {
      res
        .status(201)
        .location(`${req.baseUrl}/${subscription.id}`)
        .send(hidePrivateData(subscription));
    });
  }).catch(next);
});

router.get('/', function(req, res, next) {
  subscriptions.findByUserId(req.user.id).then((rows) => {
    res.send(rows.map(hidePrivateData));
  }).catch(next);
});

router.route('/:id(\\d+)')
  .get((req, res, next) => {
    subscriptions.show(req.user.id, req.params.id)
      .then((subscription) => {
        debug('Found subscription %o', subscription);
        res.send(hidePrivateData(subscription));
      }).catch(next);
  })
  .delete((req, res, next) => {
    subscriptions.delete(req.user.id, req.params.id)
    .then(() => res.status(204).end())
    .catch(next);
  })
  .put((req, res, next) => {
    const userId = req.user.id;
    const id = req.params.id;

    subscriptions.update(userId, id, req.body)
    .then(() => subscriptions.show(userId, id))
    .then((subscription) => {
      debug('Updated subscription %o', subscription);
      res.send(hidePrivateData(subscription));
    }).catch(next);
  });

module.exports = router;
