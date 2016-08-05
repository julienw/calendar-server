const chakram = require('chakram');
const expect = chakram.expect;

const { testData } = require('../dao/schema');
const db = require('../dao/database');
const dao = require('../dao/subscriptions');
const config = require('./config');
const serverManager = require('./server_manager');

describe('dao:users', () => {
  beforeEach(function*() {
    // Reset the database state between each test run
    serverManager.reinitProfile();
    yield db.init(config.profilePath);
    const dbInstance = yield db.ready;
    yield dbInstance.exec(testData);
  });

  describe('findForReminder(reminderId)', function() {
    it('should get subscriptions for a reminder', function*() {
      const subscriptions = yield dao.findForReminder(1);
      expect(subscriptions).to.deep.equal([
        {
          id: 1,
          subscription: {
            endpoint: 'some_endpoint',
            keys: {
              auth: 'some_auth',
              p256dh: 'some_p256dh',
            }
          },
          title: 'Samsung',
          userId: 1,
        },
        {
          id: null,
          subscription: {
            endpoint: null,
            keys: {
              auth: null,
              p256dh: null,
            }
          },
          title: null,
          userId: 2,
        }
      ]);
    });
  });
});
