const sinon = require('sinon');
const path = require('path');
const mq = require('zmq').socket('push');

const mqPort = 4001;
const config = require('../config.js');
config.mqPort = mqPort;
config.profile = path.join(__dirname, '../profiles/test');

describe('push notification sender', function() {
  let webpush;
  const mqUrl = `tcp://127.0.0.1:${mqPort}`;

  before(() => {
    mq.bindSync(mqUrl);
    webpush = require('web-push');
    sinon.stub(webpush, 'sendNotification');

    require('../push_sender'); // starts up
  });

  after(() => {
    mq.unbindSync(mqUrl);
    webpush.sendNotification.restore();
  });

  it('should emit push notifications on new messages', function*() {
    this.timeout(10000);

    const message = {
      reminder: 'Random data',
      subscription: {
        id: 1,
        family: 'family_name',
        title: 'Firefox 47 on Linux',
        subscription: {
          endpoint: 'https://an.end.point',
          keys: {
            p256dh: 'A fake public key',
            auth: 'A fake auth token'
          },
        },
      }
    };
    const subscription = message.subscription.subscription;

    mq.send(JSON.stringify(message));

    yield new Promise((resolve) => {
      // TODO wait until reminder is marked as done
      setTimeout(resolve, 2000);
    });

    sinon.assert.calledWith(webpush.sendNotification,
      subscription.endpoint,
      {
        userPublicKey: subscription.keys.p256dh,
        userAuth: subscription.keys.auth,
        payload: JSON.stringify(message.reminder),
      }
    );
  });
});
