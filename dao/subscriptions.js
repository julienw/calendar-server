const debug = require('debug')('DEBUG:calendar-server:subscriptions');

const database = require('./database');
const { NotFoundError } = require('../utils/errors');
const { checkPropertyType } = require('../utils/object_validator.js');

function notFoundError(id) {
  return NotFoundError.createWithSubject(
    'subscription', { name: 'id', value: id }
  );
}

function endpointNotFoundError(endpoint) {
  return NotFoundError.createWithSubject(
    'subscription', { name: 'endpoint', value: endpoint }
  );
}

function unflatten(item) {
  return {
    id: item.id,
    userId: item.user_id,
    title: item.title,
    subscription: {
      endpoint: item.endpoint,
      keys: {
        p256dh: item.p256dh,
        auth: item.auth
      }
    }
  };
}

module.exports = {
  findByUserId(userId) {
    debug('index(userId=%s)', userId);
    return database.ready
      .then(
        db => db.all('SELECT * FROM subscription WHERE user_id = ?', userId)
      ).then(items => items.map(unflatten));
  },

  create(userId, subscription) {
    debug('create(userId=%s, subscription=%o)', userId, subscription);
    checkPropertyType(subscription, 'subscription', 'object');
    checkPropertyType(subscription.subscription, 'keys', 'object');

    return database.ready
      .then(db => db.run(
        `INSERT INTO subscription
          (user_id, title, endpoint, p256dh, auth)
          VALUES (?, ?, ?, ?, ?)`,
          userId,
          subscription.title,
          subscription.subscription.endpoint,
          subscription.subscription.keys.p256dh,
          subscription.subscription.keys.auth // TODO Encrypt this value
      ))
      .then(result => result.lastId);
  },

  show(userId, id) {
    debug('show(userId=%s, id=%s)', userId, id);

    return database.ready
      .then(db => db.get(
        'SELECT * FROM subscription WHERE user_id = ? AND id = ?',
        userId, id
      ))
      .then(row => row || Promise.reject(notFoundError(id)))
      .then(unflatten);
  },

  findByEndpoint(userId, endpoint) {
    debug('findByEndpoint(userId=%s, endpoint=%s)', userId, endpoint);
    return database.ready
      .then(db => db.get(
        'SELECT * FROM subscription WHERE user_id = ? AND endpoint = ?',
        userId, endpoint
      ))
      .then(row => row || Promise.reject(endpointNotFoundError(endpoint)))
      .then(unflatten);
  },

  findForReminder(reminderId) {
    debug('findForReminder(reminderId=%s)', reminderId);

    /* LEFT JOIN lets us getting "null" for subscription data if it's
     * non-existent. */
    return database.ready
      .then(db => db.all(
        `SELECT DISTINCT subscription.*, user_reminder.user_id user_id
         FROM reminder, user_reminder
         LEFT JOIN subscription
          ON subscription.user_id = user_reminder.user_id
        WHERE
          user_reminder.reminder_id = ?
        `, reminderId
      ))
      .then(rows => rows.map(unflatten));
  },

  delete(userId, id) {
    debug('delete(userId=%s, id=%s)', userId, id);
    return database.ready
      .then(db => db.delete(
        'FROM subscription WHERE user_id = ? AND id = ?',
        userId, id
      ));
  },

  update(userId, id, updatedSubscription) {
    debug('update(userId=%s, id=%s)', userId, id);
    return database.ready
      .then(db => db.update(
        `subscription SET
        title = ?
        WHERE user_id = ? AND id = ?`,
        updatedSubscription.title,
        userId, id
      ));
  },

};
