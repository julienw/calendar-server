const chakram = require('chakram');
const expect = chakram.expect;

const serverManager = require('./server_manager');
const config = require('./config.js');

describe('/subscriptions', function() {
  const subscriptionsUrl = `${config.apiRoot}/subscriptions`;

  const initialSubscription = {
    title: 'my_beautiful_subscription',
    subscription: {
      endpoint: 'https://some.endpoint',
      keys: {
        p256dh: 'some_base_64',
        auth: 'some_base_64'
      }
    }
  };

  const expectedSubscription = {
    id: 1,
    title: initialSubscription.title,
    subscription: {
      endpoint: initialSubscription.subscription.endpoint,
      keys: {
        p256dh: initialSubscription.subscription.keys.p256dh,
      }
    }
  };

  // In the test we'll try to change all fields, but only `title` should change.
  const updatedSubscription = {
    id: 1,
    title: 'my_updated_subscription',
    subscription: {
      endpoint: 'https://updated.endpoint',
      keys: {
        p256dh: 'updated_base_64',
        auth: 'updated_base_64'
      }
    }
  };

  const expectedUpdatedSubscription = Object.assign(
    {}, expectedSubscription,
    { title: updatedSubscription.title }
  );

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

  it('should implement basic CRUD functionality', function() {
    const expectedLocation = `${subscriptionsUrl}/1`;

    return chakram.post(subscriptionsUrl, initialSubscription).then(res => {
      expect(res).status(201);
      expect(res).header('location', '/api/v1/subscriptions/1');

      return chakram.get(subscriptionsUrl);
    }).then(res => {
      expect(res).status(200);
      expect(res.body).deep.equal([expectedSubscription]);

      return chakram.put(expectedLocation, updatedSubscription);
    }).then(res => {
      expect(res).status(204);

      return chakram.get(expectedLocation);
    }).then(res => {
      expect(res).status(200);
      expect(res.body).deep.equal(expectedUpdatedSubscription);

      return chakram.delete(expectedLocation);
    }).then(res => {
      expect(res).status(204);

      return chakram.get(subscriptionsUrl);
    }).then(res => {
      expect(res.body).deep.equal([]);
    });
  });

  it('404 errors', function() {
    const location = `${subscriptionsUrl}/99999`;
    return chakram.get(location).then(res => {
      expect(res).status(404);

      return chakram.put(location, {});
    }).then(res => {
      expect(res).status(404);

      return chakram.delete(location);
    }).then(res => {
      expect(res).status(404);
    });
  });

});
