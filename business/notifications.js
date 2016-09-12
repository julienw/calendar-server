const debug = require('debug')('calendar-server:business/notifications');

const subscriptionsDao = require('../dao/subscriptions');
const remindersDao = require('../dao/reminders');
const config = require('../config');
const mq = require('zmq').socket('push');

const mqUrl = `tcp://127.0.0.1:${config.mqPort}`;

let intervalId;

function sendReminderAndUpdateDatabase(reminder, subscriptions) {
  const errorStatus = 'error-no-subscription';
  const successPromises = [];
  const errorPromises = [];

  subscriptions.forEach(subscription => {
    if (subscription.id === null) {
      debug('User "%s" has no subscription, marking reminder #%s as "%s"',
        subscription.userId, reminder.id, errorStatus
      );
      errorPromises.push(
        remindersDao.setReminderStatus(reminder.id, errorStatus)
      );
    } else {
      const message = { reminder, subscription };
      successPromises.push(
        mq.send(JSON.stringify(message))
      );
    }
  });

  return Promise.all(successPromises)
    .then(() => {
      if (errorPromises.length) {
        return Promise.resolve();
      }
      return remindersDao.setReminderStatus(reminder.id, 'pending');
    });
}

function sendNewNotifications() {
  const now = Date.now();
  if (debug.enabled) {
    debug(
      'Polling reminders that are due at %d (%s)',
      now, new Date(now)
    );
  }

  remindersDao.findAllDueReminders(now)
    .then(reminders => {
      debug('Found reminders: %o', reminders);

      const remindersPromises = reminders.map(reminder =>
        subscriptionsDao.findForReminder(reminder.id)
          .then(subscriptions => {
            debug('Found subscriptions: %o', subscriptions);
            return sendReminderAndUpdateDatabase(reminder, subscriptions);
          })
      );
      return Promise.all(remindersPromises);
    }).catch(err => {
      // Bubble up errors, otherwise they are silently dropped
      console.error(err);
    });
}

function start() {
  mq.bindSync(mqUrl);
  console.log(`0mq server listening on port ${config.mqPort}`);

  const delay = config.notificationPoll;
  if (!intervalId) {
    intervalId = setInterval(sendNewNotifications, delay);
  }
}

function stop() {
  if (intervalId) {
    clearInterval(intervalId);
  }
  mq.unbindSync(mqUrl);
}

module.exports = { start, stop };
