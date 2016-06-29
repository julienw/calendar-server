const debug = require('debug')('calendar-server:business/push_sender');
const config = require('./config');
const mq = require('zmq').socket('pull');
const webpush = require('web-push');
const dao = require('./dao/reminders');

if (config.gcmKey) {
  webpush.setGCMAPIKey(config.gcmKey);
} else {
  console.warn('Google\'s GCM API Key has not been defined.');
  console.warn('  Push Notifications won\'t work in Chrome.');
}

mq.connect(`tcp://127.0.0.1:${config.mqPort}`);

mq.on('message', function(message) {
  Promise.resolve().then(() => {
    message = JSON.parse(message.toString());
    debug('Received message %o', message);
    return webpush.sendNotification(
      message.subscription.endpoint,
      {
        userPublicKey: message.subscription.keys.p256dh,
        userAuth: message.subscription.keys.auth,
        payload: JSON.stringify(message.reminder),
      }
    );
  }).then(
    () => dao.setReminderStatus(message.reminder.id, 'done')
  ).catch((err) => {
    console.error('PushSender: Could not send WebPush', err);
    // TODO in case of 410 error, remove the subscription
    // Downgrading status to waiting, so we'll try to send the push again
    return dao.setReminderStatus(message.reminder.id, 'error');
  });
});
