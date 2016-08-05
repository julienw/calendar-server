const chakram = require('chakram');
const expect = chakram.expect;

const { testData } = require('../dao/schema');
const db = require('../dao/database');
const users = require('../dao/users');
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

  describe('create(newUserObject)', function() {
    it('should create a new user', function*() {
      const TEST_EMAIL = 'test@example.com';
      const TEST_PASSWORD = '/0!/~passw0rd';
      yield users.create({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        forename: 'Person'
      });

      const user = yield users.authenticate(TEST_EMAIL, TEST_PASSWORD);
      expect(user).deep.equal({
        id: 4,
        email: TEST_EMAIL,
        forename: 'Person'
      });
    });
  });

  describe('getUserByNameInGroup(name, groupId)', function() {
    it('should get the user by name in a group', function*() {
      const user = yield users.getByNameAndGroup('Ana', 1);

      expect(user).to.deep.equal({
        forename: 'Ana',
        email: 'email@email.com',
        id: 1
      });
    });
  });

  describe('getUserFromUserId(userId)', function() {
    it('should get a user from their user id', function*() {
      const user = yield users.getById(1);
      expect(user).to.deep.equal({
        forename: 'Ana',
        email: 'email@email.com',
        id: 1,
      });

      const groups = yield users.getGroupsForUser(1);
      expect(groups).to.deep.equal([
        { id: 1, name: 'Smith' },
        { id: 2, name: 'B' }
      ]);
    });
  });

  describe('getUserFromEmail(email)', function() {
    it('should get a user from their email address', function*() {
      const user = yield users.getByEmail('email@email.com');
      expect(user).to.deep.equal({
        forename: 'Ana',
        id: 1,
        email: 'email@email.com',
      });
    });
  });
});
