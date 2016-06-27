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

  beforeEach(function() {
    return serverManager.start()
      .then(() => chakram.post(
        `${config.apiRoot}/login`,
        { user: 'family_name', password: 'password' }
      )).then(res => {
        chakram.setRequestDefaults({
          headers: {
            Authorization: `Bearer ${res.body.token}`
          }
        });
      });
  });

  afterEach(function() {
    chakram.clearRequestDefaults();
    return serverManager.stop();
  });

  it('should add a new notification endpoint and make it visible', function() {
    return chakram.post(notificationsUrl, initialNotification).then(res => {
      expect(res).status(201);
      expect(res).header('location', '/api/v1/notifications/1');

      return chakram.get(notificationsUrl);
    }).then(res => {
      expect(res.body).deep.equal([expectedNotification]);
    });
  });
});
