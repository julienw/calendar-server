const chakram = require('chakram');
const expect = chakram.expect;

const serverManager = require('./server_manager');
const config = require('./config.js');

describe('/notifications', function() {
  const notificationsUrl = `${config.apiRoot}/notifications`;

  const initialNotification = {
    identifier: 'my_beautiful_notification',
    subscription: {
      endpoint: 'https://some.endpoint',
      keys: {
        p256dh: 'some_base_64',
        auth: 'some_base_64'
      }
    }
  };

  const expectedNotification = {
    identifier: initialNotification.identifier,
    subscription: {
      endpoint: initialNotification.subscription.endpoint,
      keys: {
        p256dh: initialNotification.subscription.keys.p256dh,
      }
    }
  };

  beforeEach(function*() {
    yield serverManager.start();

    const res = yield chakram.post(
      `${config.apiRoot}/login`,
      { user: 'family_name', password: 'password' }
    );

    chakram.setRequestDefaults({
      headers: {
        Authorization: `Bearer ${res.body.token}`
      }
    });
  });

  afterEach(function*() {
    chakram.clearRequestDefaults();
    yield serverManager.stop();
  });

  it('should add a new notification endpoint and make it visible', function*() {
    let res = yield chakram.post(notificationsUrl, initialNotification);
    expect(res).status(201);
    expect(res).header('location', '/api/v1/notifications/1');

    res = yield chakram.get(notificationsUrl);
    expect(res.body).deep.equal([expectedNotification]);
  });
});
