process.env.DEBUG_FD = 1; // debug() echoes to stdout instead of stderr

const debug = require('debug')('calendar-server:push_sender');
const config = require('./config');
const mq = require('zmq').socket('pull');
const webpush = require('web-push');
const twilio = require('./business/twilio');

const database = require('./dao/database');
const daoReminders = require('./dao/reminders');
const daoSubscriptions = require('./dao/subscriptions');

database.init(config.profile);

if (config.gcmKey) {
  webpush.setGCMAPIKey(config.gcmKey);
} else {
  console.warn('Google\'s GCM API Key has not been defined.');
  console.warn('  Push Notifications won\'t work in Chrome.');
}

let supportSmsNotifications = true;
if (!config.twilioAccountSID ||
    !config.twilioPhoneNumber ||
    !config.twilioAuthToken) {
  supportSmsNotifications = false;
  console.warn('Twilio\'s configuration is missing.');
  console.warn('  SMS notifications won\'t be sent.');
}

const mqUrl = `tcp://127.0.0.1:${config.mqPort}`;

mq.connect(mqUrl);

function sendWebpushNotification(subscriptionObj, payload) {
  debug(
    'sendWebpushNotification(subscriptionObj=%o, payload=%o)',
    subscriptionObj, payload
  );
  const subscription = subscriptionObj.subscription;

  return webpush.sendNotification(
    subscription.endpoint,
    {
      userPublicKey: subscription.keys.p256dh,
      userAuth: subscription.keys.auth,
      payload: JSON.stringify(payload),
    }
  );
}

function sendSmsNotification(smsInfo) {
  debug('sendSmsNotification(smsInfo=%o)', smsInfo);
  return twilio(smsInfo.target, smsInfo.body);
}

mq.on('message', function(message) {
  let reminder;

  Promise.resolve().then(() => {
    message = JSON.parse(message.toString());
    debug('Received message %o', message);
    const notifications = message.notifications;
    reminder = message.reminder;

    return Promise.all(notifications.map(notification => {
      if (notification.subscription) {
        return sendWebpushNotification(notification.subscription, reminder)
          .catch(err => {
            if (err.statusCode === 410) { // subscription gone
              const id = notification.subscription.id;
              debug('Subscription #%s deleted (was gone)', id);
              return daoSubscriptions.delete(id);
            }
            throw err;
          });
      } else if (notification.sms) {
        if (!supportSmsNotifications) {
          return Promise.reject(new Error(
            `Could not send a SMS notification for ${notification.sms.target}` +
            ` because Twilio is not properly configured.`
          ));
        }
        return sendSmsNotification(notification.sms);
      }
      return Promise.reject(new Error('Invalid message'));
    }));
  }).then(
    () => daoReminders.setReminderStatusIfNotError(reminder.id, 'done')
  ).catch((err) => {
    debug('Unhandled error', err);
    console.error('PushSender: Unhandled error', err);
    return daoReminders.setReminderStatus(reminder.id, 'error');
  });
});


function gracefulExit() {
  console.log('Received exit request. Closing push_sender...');
  mq.disconnect(mqUrl);
  database.close()
    .then(() => process.exit())
    .catch((err) => {
      console.error('Error while closing app: ', err);
      process.exit(1);
    });
}

process.on('SIGINT', gracefulExit);
process.on('SIGTERM', gracefulExit);
