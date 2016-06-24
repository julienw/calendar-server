const debug = require('debug')('calendar-server:notifications');

const database = require('./database');
const { checkPropertyType } = require('../utils/object_validator.js');

module.exports = {
  index(family) {
    debug('index family=%s', family);
    return database.ready
      .then(
        db => db.all('SELECT * FROM notifications WHERE family = ?', family)
      );
  },

  create(family, notification) {
    debug('create notification %o for family %s', notification, family);
    checkPropertyType(notification, 'subscription', 'object');
    checkPropertyType(notification.subscription, 'keys', 'object');

    return database.ready
      .then(db => db.run(
        `INSERT INTO notifications
          (family, identifier, endpoint, p256dh, auth)
          VALUES (?, ?, ?, ?, ?)`,
          family,
          notification.identifier,
          notification.subscription.endpoint,
          notification.subscription.keys.p256dh,
          notification.subscription.keys.auth // TODO Encrypt this value
      ));
  },

  // takes a `reminder` id as parameter
  show(family, reminderId) {
    debug('show reminder #%s for family %s', reminderId, family);

    return database.ready
      .then(db => db.get(
        'SELECT * FROM reminders WHERE family = ? AND id = ?',
        family, reminderId
      ));
  },

  // takes a `reminder` id as parameter
  delete(family, reminderId) {
    debug('delete reminder #%s for family %s', reminderId, family);
    return database.ready
      .then(db => db.run(
        'DELETE FROM reminders WHERE family = ? AND id = ?',
        family, reminderId
      ));
  },

  // takes a `reminder` id as parameter
  update(family, reminderId, updatedReminder) {
    debug('update reminder #%s for family %s', reminderId, family);
    return database.ready
      .then(db => db.run(
        `UPDATE reminders SET
        recipient = ?,
        message = ?,
        due = ?
        WHERE family = ? AND id = ?`,
        updatedReminder.recipient,
        updatedReminder.message,
        updatedReminder.due,
        family, reminderId
      ));
  },
};
