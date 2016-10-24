const sinon = require('sinon');
const request = require('request');
const webpush = require('web-push');

const mq = require('zmq').socket('push');

const testConfig = require('./config');
const appConfig = require('../config');
appConfig.mqPort = testConfig.mqPort;
appConfig.profile = testConfig.profilePath;
appConfig.twilioPhoneNumber = 'PHONE_NUMBER';
appConfig.twilioAuthToken = 'AUTH_TOKEN';
appConfig.twilioAccountSID = 'ACCOUNT_SID';

const serverManager = require('./server_manager');
const db = require('../dao/database');
const { testData } = require('../dao/schema');

const { waitUntilReminderHasStatus } = require('./lib/wait');

describe('push notification sender', function() {
  const mqUrl = `tcp://127.0.0.1:${testConfig.mqPort}`;

  before(() => {
    mq.bindSync(mqUrl);
    sinon.stub(webpush, 'sendNotification').returns(Promise.resolve());
    sinon.stub(request, 'post').yields(null, { statusCode: 201 });

    require('../push_sender'); // starts up
  });

  after(() => {
    mq.unbindSync(mqUrl);
    webpush.sendNotification.restore();
    request.post.restore();
  });

  beforeEach(function*() {
    // Reset the database state between each test run
    serverManager.reinitProfile();
    yield db.init(testConfig.profilePath);
    const dbInstance = yield db.ready;
    yield dbInstance.exec(testData);
  });

  afterEach(() => {
    webpush.sendNotification.reset();
    request.post.reset();
  });

  it('should emit push notifications on new messages', function*() {
    const reminderId = 1;
    const subscription = {
      endpoint: 'https://an.end.point',
      keys: {
        p256dh: 'A fake public key',
        auth: 'A fake auth token'
      },
    };

    const message = {
      reminder: {
        id: reminderId,
        action: 'Pick up kids at school',
        due: 1466613000000,
        status: 'pending',
      },
      notifications: [{
        subscription: {
          id: 1,
          userId: 1,
          title: 'Firefox 47 on Linux',
          subscription,
        }
      }]
    };

    mq.send(JSON.stringify(message));

    yield waitUntilReminderHasStatus(reminderId, 'done');

    sinon.assert.calledWith(webpush.sendNotification,
      subscription.endpoint,
      {
        userPublicKey: subscription.keys.p256dh,
        userAuth: subscription.keys.auth,
        payload: JSON.stringify(message.reminder),
      }
    );
  });

  it('should emit SMS notifications on new messages', function*() {
    const reminderId = 1;
    const sms = {
      target: '+12123456789',
      body: 'some body'
    };

    const message = {
      reminder: {
        id: reminderId,
        action: 'Pick up kids at school',
        due: 1466613000000,
        status: 'pending',
      },
      notifications: [{ sms }]
    };
    mq.send(JSON.stringify(message));
    yield waitUntilReminderHasStatus(reminderId, 'done');
    sinon.assert.calledWithMatch(request.post, appConfig.twilioAccountSID, {
      auth: {
        user: appConfig.twilioAccountSID,
        pass: appConfig.twilioAuthToken
      },
      form: {
        Body: sms.body,
        To: sms.target,
        From: appConfig.twilioPhoneNumber
      }
    });
  });

  it('should properly put US numbers in international format', function*() {
    const reminderId = 1;
    const sms = {
      target: '2123456789',
      body: 'some body'
    };

    const message = {
      reminder: {
        id: reminderId,
        action: 'Pick up kids at school',
        due: 1466613000000,
        status: 'pending',
      },
      notifications: [{ sms }]
    };
    mq.send(JSON.stringify(message));
    yield waitUntilReminderHasStatus(reminderId, 'done');
    sinon.assert.calledWithMatch(request.post, appConfig.twilioAccountSID, {
      auth: {
        user: appConfig.twilioAccountSID,
        pass: appConfig.twilioAuthToken
      },
      form: {
        Body: sms.body,
        To: '+12123456789',
        From: appConfig.twilioPhoneNumber
      }
    });
  });
});
