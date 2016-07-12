const debug = require('debug')('calendar-server:routes/subscriptions');

const express = require('express');
const subscriptions = require('../dao/subscriptions');
const { DuplicateEndpointError, NotFoundError } = require('../utils/errors');

const router = express.Router();

function hidePrivateData(item) {
  delete item.family;
  delete item.subscription.keys.auth;
  return item;
}

router.post('/', function(req, res, next) {
  const family = req.user.family;

  const endpoint = req.body.subscription.endpoint;
  subscriptions.findByEndpoint(family, endpoint).then((subscription) => {
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

    return subscriptions.create(family, req.body).then((id) => {
      debug('Subscription #%s has been created in database', id);

      return subscriptions.show(family, id);
    }).then((subscription) => {
      res
        .status(201)
        .location(`${req.baseUrl}/${subscription.id}`)
        .send(hidePrivateData(subscription));
    });
  }).catch(next);
});

router.get('/', function(req, res, next) {
  subscriptions.index(req.user.family).then((rows) => {
    res.send(rows.map(hidePrivateData));
  }).catch(next);
});

router.route('/:id')
  .get((req, res, next) => {
    subscriptions.show(req.user.family, req.params.id)
      .then((subscription) => {
        debug('Found subscription %o', subscription);
        res.send(hidePrivateData(subscription));
      }).catch(next);
  })
  .delete((req, res, next) => {
    subscriptions.delete(req.user.family, req.params.id)
    .then(() => res.status(204).end())
    .catch(next);
  })
  .put((req, res, next) => {
    const family = req.user.family;
    const id = req.params.id;

    subscriptions.update(family, id, req.body)
    .then(() => subscriptions.show(family, id))
    .then((subscription) => {
      debug('Updated subscription %o', subscription);
      res.send(hidePrivateData(subscription));
    }).catch(next);
  });

module.exports = router;
