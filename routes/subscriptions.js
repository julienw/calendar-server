const debug = require('debug')('calendar-server:routes/subscriptions');

const express = require('express');
const subscriptions = require('../dao/subscriptions');
const { DuplicateEndpointError, NotFoundError } = require('../utils/errors');

const router = express.Router();

function hidePrivateData(item) {
  delete item.subscription.keys.auth;
  delete item.userId;
  return item;
}

function notFoundError(id) {
  return NotFoundError.createWithSubject(
    'subscription', { name: 'id', value: id }
  );
}

function checkSubscriptionForUser(req, res, next) {
  const subscriptionId = +req.params.id;
  const userId = +req.user.id;
  subscriptions.isSubscriptionForUser(subscriptionId, userId)
    .then(isForUser => {
      if (isForUser) {
        next();
        return;
      }
      debug('Subscription %s is not for user %s', subscriptionId, userId);
      next(notFoundError(subscriptionId));
    });
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
  .delete(
    checkSubscriptionForUser,
    (req, res, next) => {
      subscriptions.delete(req.params.id)
        .then(() => res.status(204).end())
        .catch(next);
    }
  )
  .put(
    checkSubscriptionForUser,
    (req, res, next) => {
      const id = req.params.id;

      subscriptions.update(id, req.body)
        .then(() => subscriptions.show(req.user.id, id))
        .then((subscription) => {
          debug('Updated subscription %o', subscription);
          res.send(hidePrivateData(subscription));
        })
        .catch(next);
    }
  );

module.exports = router;
