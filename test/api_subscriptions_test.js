const chakram = require('chakram');
const expect = chakram.expect;

const serverManager = require('./server_manager');
const config = require('./config.js');

const api = require('./api_tooling');

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

  const user = {
    forename: 'Jane',
    password: 'Hello World',
    email: 'jane@family.com',
  };

  const otherUser = {
    forename: 'Alice',
    password: 'Cheshire cat is wonderful',
    email: 'alice@wonderland.me',
  };

  beforeEach(function*() {
    yield serverManager.start();

    user.id = yield* api.createUser(user);
    otherUser.id = yield* api.createUser(otherUser);
    yield* api.login(user.email, user.password);
  });

  afterEach(function*() {
    api.logout();
    yield serverManager.stop();
  });

  it('should implement basic CRUD functionality', function*() {
    const expectedLocation = `${subscriptionsUrl}/1`;
    const endpoint = initialSubscription.subscription.endpoint;

    let res = yield chakram.post(subscriptionsUrl, initialSubscription);
    expect(res).status(201);
    expect(res).header('location', '/api/v2/subscriptions/1');
    expect(res.body).deep.equal(expectedSubscription);

    res = yield chakram.post(subscriptionsUrl, initialSubscription);
    expect(res).status(409);
    expect(res.body).deep.equal({
      error: 'DuplicateEndpointError',
      code: 'duplicate_endpoint',
      message:
        `A subscription with endpoint "${endpoint}" is already registered.`,
      data: expectedSubscription
    });

    res = yield chakram.get(subscriptionsUrl);
    expect(res).status(200);
    expect(res.body).deep.equal([expectedSubscription]);

    res = yield chakram.put(expectedLocation, updatedSubscription);
    expect(res).status(200);
    expect(res.body).deep.equal(expectedUpdatedSubscription);

    res = yield chakram.get(expectedLocation);
    expect(res).status(200);
    expect(res.body).deep.equal(expectedUpdatedSubscription);

    res = yield chakram.delete(expectedLocation);
    expect(res).status(204);

    res = yield chakram.get(subscriptionsUrl);
    expect(res.body).deep.equal([]);
  });

  it('should prevent some operations from other users', function*() {
    const expectedLocation = `${subscriptionsUrl}/1`;

    let res = yield chakram.post(subscriptionsUrl, initialSubscription);
    expect(res).status(201);

    yield* api.login(otherUser.email, otherUser.password);

    res = yield chakram.get(subscriptionsUrl);
    expect(res).status(200);
    expect(res.body).deep.equal([]);

    res = yield chakram.get(expectedLocation);
    expect(res).status(404);

    res = yield chakram.delete(expectedLocation);
    expect(res).status(404);

    res = yield chakram.put(expectedLocation, initialSubscription);
    expect(res).status(404);
  });

  it('404 errors', function*() {
    const location = `${subscriptionsUrl}/99999`;
    let res = yield chakram.get(location);
    expect(res).status(404);

    res = yield chakram.put(location, {});
    expect(res).status(404);

    res = yield chakram.delete(location);
    expect(res).status(404);
  });
});
