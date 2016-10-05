const chakram = require('chakram');
const expect = chakram.expect;

const config = require('./config');
const serverManager = require('./server_manager');

const api = require('./api_tooling');

describe('/groups', function() {

  beforeEach(function* () {
    yield serverManager.start();

    const user = {
      email: 'Julien@julien.com',
      password: 'Hello World',
      forename: 'Julien',
    };

    user.id = yield api.createUser(user);
    yield api.login(user.email, user.password);
  });

  afterEach(function* () {
    yield serverManager.stop();
  });

  it('can create a group', function*() {
    const group = { name: 'CD_Staff' };

    const res = yield chakram.post(
      `${config.apiRoot}/groups`, group
    );
    expect(res).status(201);
    expect(res.body).deep.equal({
      id: 1,
      name: group.name
    });
  });

  describe('Retrieving a group', function() {
    const group = { name: 'CD_Staff' };

    beforeEach(function*() {
      group.id = yield api.createGroup(group);
    });

    it('can retrieve a group', function*() {
      const res = yield chakram.get(
        `${config.apiRoot}/groups/${group.id}`
      );

      expect(res).status(200);
      expect(res.body).deep.equal(group);
    });

    it('prevents to retrieve a group for users not in the group', function*() {
      api.logout();

      const user2 = {
        email: 'johan@johan.com',
        password: 'Hello France',
        forename: 'Johan',
      };

      user2.id = yield api.createUser(user2);
      yield api.login(user2.email, user2.password);

      const res = yield chakram.get(
        `${config.apiRoot}/groups/${group.id}`
      );

      expect(res).status(404);
    });
  });
});
