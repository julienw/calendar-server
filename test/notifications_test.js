const chakram = require('chakram');
const expect = chakram.expect;
const sinon = require('sinon');
const mq = require('zmq').socket('pull');

const serverManager = require('./server_manager');
const api = require('./api_tooling');
const config = require('./config.js');
const database = require('../dao/database');

const { waitUntilReminderHasStatus } = require('./lib/wait');

function waitForMqMessage() {
  return new Promise(resolve => {
    mq.once('message', (message) => {
      message = JSON.parse(message.toString());
      // Undeterministic timestamp. Asserting against it doesn't
      // provide any value to the test
      delete message.reminder.created;
      resolve(message);
    });
  });
}

describe('notifications', function() {
  this.timeout(10000); // Tests last longer than the regular 2s-allowed-span.

  const subscription = {
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
    userId: 1,
    title: subscription.title,
    subscription: {
      endpoint: subscription.subscription.endpoint,
      keys: {
        p256dh: subscription.subscription.keys.p256dh,
        auth: subscription.subscription.keys.auth
      },
    },
  };

  const user = {
    email: 'john@helloworld.com',
    password: 'Hello World',
    forename: 'John',
  };

  const inputs = [{
    recipients: [{ userId: 1 }],
    action: 'Pick up kids at school',
    due: Date.now(),
  }, {
    recipients: [{ userId: 1 }],
    action: 'Buy milk',
    due: Date.now(),
  }, {
    recipients: [{ userId: 1 }],
    action: 'Go to school',
    due: Date.now(),
  }];

  const outputs = inputs.map((input, i) => {
    const reminder = {
      id: i + 1,
      action: input.action,
      due: input.due,
      // FIXME: The status value shouldn't be sent to the message queue, as it
      // gives an outdated information
      status: 'waiting'
    };

    return {
      reminder,
      subscription: expectedSubscription
    };
  });

  const mqSocket = `tcp://127.0.0.1:${config.mqPort}`;

  beforeEach(function*() {
    yield serverManager.start();
    user.id = yield* api.createUser(user);
    yield* api.login(user.email, user.password);
  });

  afterEach(function* () {
    yield serverManager.stop();
  });

  describe('no subscription registered', function() {
    beforeEach(function() {
      return database.init(config.profilePath);
    });

    afterEach(function() {
      return database.close();
    });

    it('marks reminder as errored', function*() {
      const mqMessageSpy = sinon.spy();
      waitForMqMessage().then(mqMessageSpy);

      const reminderId = yield* api.createReminder(inputs[0]);
      yield waitUntilReminderHasStatus(
        reminderId, 'error-no-subscription'
      );
      sinon.assert.notCalled(mqMessageSpy);
    });
  });

  describe('once subscriptions are registered', function() {
    beforeEach(function*() {
      mq.connect(mqSocket);
      yield* api.createSubscription(subscription);
    });

    afterEach(function() {
      mq.disconnect(mqSocket);
    });

    it('does not send a reminder twice to the message queue', function*() {
      // We try to determine if the first reminder has been sent only once.
      // In order to do so, we verify that this reminder is not sent a second
      // time in the second setInterval. As our SQL queries are not ordered, it
      // might occur that the first reminder pops up after the second one (in
      // the second interval). Hence, the 3rd reminder is a sentinel to make
      // sure we entered a new interval.
      for (let i = 0; i < inputs.length; i++) {
        yield* api.createReminder(inputs[i]);

        const message = yield waitForMqMessage();
        expect(message).deep.equal(outputs[i]);
      }
    });
  });
});
