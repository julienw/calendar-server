const debug = require('debug')('calendar-server:business/notifications');

const subscriptionsDao = require('../dao/subscriptions');
const remindersDao = require('../dao/reminders');
const config = require('../config');
const mq = require('zmq').socket('push');

const mqUrl = `tcp://127.0.0.1:${config.mqPort}`;

let intervalId;

function getMessagesByWebpush(subscriptions) {
  const noSubscriptionUsers = [];
  const notifications = [];

  subscriptions.forEach(subscription => {
    if (subscription.id === null) {
      debug('User "%s" has no subscription', subscription.userId);
      noSubscriptionUsers.push(+subscription.userId);
    } else {
      notifications.push({ subscription });
    }
  });

  return { noSubscriptionUsers, notifications };
}

function getMessagesByText(reminder, recipients) {
  debug('Will send reminder %o to %o through text', reminder, recipients);
  const noPhoneNumberUsers = [];
  const notifications = [];

  const localizedDate = new Date(reminder.due)
    .toLocaleTimeString('en-US', {
      timeZone: 'America/Los_Angeles',
      hour: 'numeric',
      minute: 'numeric'
    });

  const body =
    `Reminder from Abigail:\n${reminder.action} at ${localizedDate}`;

  recipients.forEach(recipient => {
    if (recipient.phoneNumber) {
      const message = { sms: { target: recipient.phoneNumber, body }};
      notifications.push(message);
    } else {
      debug('User "%s" has no phoneNumber', recipient.id);
      noPhoneNumberUsers.push(+recipient.id);
    }
  });

  return { notifications, noPhoneNumberUsers };
}

function sendNewNotifications() {
  const errorStatus = 'error-no-subscription';

  const dueDate = Date.now() + 5 * 60 * 1000; // 5min
  if (debug.enabled) {
    debug(
      'Polling reminders that are due at %d (%s)',
      dueDate, new Date(dueDate)
    );
  }

  remindersDao.findAllDueReminders(dueDate)
    .then(reminders => {
      debug('Found reminders: %o', reminders);

      const remindersPromises = reminders.map(reminder => {
        const statusPromise =
          remindersDao.setReminderStatus(reminder.id, 'pending');

        const webpushPromise = subscriptionsDao.findForReminder(reminder.id)
          .then(subscriptions => {
            debug('Found subscriptions: %o', subscriptions);
            return getMessagesByWebpush(subscriptions);
          });
        const textPromise = remindersDao.getRecipients(reminder.id)
          .then(recipients => getMessagesByText(reminder, recipients));

        return Promise.all([ webpushPromise, textPromise, statusPromise ])
          .then(([ webpush, text ]) => {
            const notifications =
              webpush.notifications.concat(text.notifications);
            const sendingMessagesPromise =
              notifications.length
              ? mq.send(JSON.stringify({ reminder, notifications }))
              : Promise.resolve();

            const erroredUsers = webpush.noSubscriptionUsers.filter(
              userId => text.noPhoneNumberUsers.includes(userId)
            );

            if (erroredUsers.length) {
              throw new Error(
                `User(s) ${erroredUsers.join(', ')} had no way to be ` +
                `notified for reminder ${reminder.id}`
              );
            }
            return sendingMessagesPromise;
          })
          .catch(
            (e) => {
              remindersDao.setReminderStatus(reminder.id, errorStatus);
              throw e;
            }
          );
      });
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
