const chakram = require('chakram');
const expect = chakram.expect;

const config = require('./config');
const serverManager = require('./server_manager');

const api = require('./api_tooling');

describe('/users', function() {

  beforeEach(function* () {
    yield serverManager.start();
  });

  afterEach(function* () {
    yield serverManager.stop();
  });

  it('can create user', function*() {
    const user = {
      email: 'Julien@julien.com',
      password: 'Hello World',
      forename: 'Julien',
    };

    const res = yield chakram.post(
      `${config.apiRoot}/users`, user
    );
    expect(res).status(201);
    expect(res.body).deep.equal({
      id: 1,
      forename: user.forename,
    });
  });

  it('can retrieve a user', function*() {
    const user = {
      email: 'Julien@julien.com',
      password: 'Hello World',
      forename: 'Julien',
    };

    user.id = yield api.createUser(user);
    yield api.login(user.email, user.password);

    const res = yield chakram.get(
      `${config.apiRoot}/users/${user.id}`
    );

    expect(res).status(200);
    expect(res.body).deep.equal({
      id: user.id,
      forename: user.forename,
    });
  });

  it('Other users within the same group can retrieve a user', function*() {
    const user1 = {
      email: 'Julien@julien.com',
      password: 'Hello World',
      forename: 'Julien',
    };

    const user2 = {
      email: 'johan@johan.com',
      password: 'Hello France',
      forename: 'Johan',
    };

    const group = { name: 'CD_Staff' };

    user1.id = yield api.createUser(user1);
    user2.id = yield api.createUser(user2);
    yield api.login(user1.email, user1.password);

    // Trying to fetch the user without a common group should fail
    let res = yield chakram.get(
      `${config.apiRoot}/users/${user2.id}`
    );

    expect(res).status(404);

    // OK, adding a common group
    group.id = yield api.createGroup(group);
    // user 1 is already in group
    yield api.addUserToGroup(user2.id, group.id);

    res = yield chakram.get(
      `${config.apiRoot}/users/${user2.id}`
    );

    // working !!
    expect(res).status(200);
    expect(res.body).deep.equal({
      id: user2.id,
      forename: user2.forename,
    });
  });

  it('can retrieve relations and groups for a user', function*() {

    // setup: 2 users in 1 group
    const user1 = {
      email: 'Julien@julien.com',
      password: 'Hello World',
      forename: 'Julien',
    };

    const user2 = {
      email: 'johan@johan.com',
      password: 'Hello France',
      forename: 'Johan',
    };

    const group = { name: 'CD_Staff' };

    user1.id = yield api.createUser(user1);
    user2.id = yield api.createUser(user2);
    yield api.login(user1.email, user1.password);

    group.id = yield api.createGroup(group);
    // user 1 is already in group
    yield api.addUserToGroup(user2.id, group.id);

    // shouldn't be able to fetch informations about user2 despite being in the
    // same group
    let res = yield chakram.get(
      `${config.apiRoot}/users/${user2.id}/groups`
    );
    expect(res).status(404);

    res = yield chakram.get(
      `${config.apiRoot}/users/${user2.id}/relations`
    );
    expect(res).status(404);

    // but should work to fetch information about user1
    res = yield chakram.get(
      `${config.apiRoot}/users/${user1.id}/groups`
    );
    expect(res).status(200);
    expect(res.body).deep.equal(
      [{ id: 1, name: 'CD_Staff' }]
    );

    res = yield chakram.get(
      `${config.apiRoot}/users/${user1.id}/relations`
    );
    expect(res).status(200);
    expect(res.body).deep.equal(
      [{ id: 2, forename: 'Johan', email: 'johan@johan.com' }]
    );
  });
});
