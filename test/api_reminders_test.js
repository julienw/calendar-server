/* eslint-disable no-unused-expressions */
const chakram = require('chakram');
const expect = chakram.expect;

const serverManager = require('./server_manager');
const api = require('./api_tooling');
const config = require('./config.js');

function assertFullRemindersAreEqual(actual, expected,
  timestampBeforeCreation, timestampAfterCreation) {
  expect(actual.created).within(
    timestampBeforeCreation, timestampAfterCreation
  );

  // Removed so we don't assert equality on this unknown value
  delete actual.created;
  expect(actual).deep.equal(expected);
}

describe('/reminders', function() {
  this.timeout(10000); // Functional tests can last longer than the default 2s.

  const remindersUrl = `${config.apiRoot}/reminders`;

  const users = [
    {
      forename: 'John',
      password: 'Hello World',
      email: 'john@family.com',
    },
    {
      forename: 'Jane',
      password: 'Hello World',
      email: 'jane@family.com',
    },
    {
      forename: 'Alice',
      password: 'White rabbit',
      email: 'alice@wonderland.me',
    }
  ];

  const initialReminder = {
    recipients: [{ userId: 2 }],
    action: 'Pick up kids at school',
    due: Date.now() + 2 * 60 * 60 * 1000,
  };

  beforeEach(function*() {
    yield serverManager.start();
    for (const user of users) {
      user.id = yield* api.createUser(user);
    }
    yield* api.login(users[0].email, users[0].password);
  });

  afterEach(function*() {
    yield serverManager.stop();
  });

  it('should implement basic CRUD functionality', function*() {
    const expectedLocation = `${remindersUrl}/1`;
    const expectedReminder = {
      id: 1,
      action: initialReminder.action,
      due: initialReminder.due,
      status: 'waiting',
    };

    const updatedReminder = {
      recipients: [{ userId: 1 }],
      action: 'Go shopping',
      due: Date.now() + 4 * 60 * 60 * 1000,
    };
    const expectedUpdatedReminder = {
      id: 1,
      action: updatedReminder.action,
      due: updatedReminder.due,
      status: 'waiting',
    };

    const timestampBeforeCreation = Date.now();

    let res = yield chakram.post(remindersUrl, initialReminder);
    const timestampAfterCreation = Date.now();
    expect(res).status(201);
    expect(res).header('location', '/api/v2/reminders/1');
    assertFullRemindersAreEqual(res.body, expectedReminder,
      timestampBeforeCreation, timestampAfterCreation);

    res = yield chakram.get(expectedLocation);
    expect(res).status(200);
    assertFullRemindersAreEqual(res.body, expectedReminder,
      timestampBeforeCreation, timestampAfterCreation);

    res = yield chakram.get(`${expectedLocation}/recipients`);
    expect(res).status(200);
    expect(res.body).deep.equal(
      [{ id: users[1].id, forename: users[1].forename, email: users[1].email }]
    );

    res = yield chakram.put(expectedLocation, updatedReminder);
    expect(res).status(200);
    assertFullRemindersAreEqual(res.body, expectedUpdatedReminder,
      timestampBeforeCreation, timestampAfterCreation);

    res = yield chakram.get(expectedLocation);
    expect(res).status(200);
    assertFullRemindersAreEqual(res.body, expectedUpdatedReminder,
      timestampBeforeCreation, timestampAfterCreation);

    res = yield chakram.get(`${expectedLocation}/recipients`);
    expect(res).status(200);
    expect(res.body).deep.equal(
      [{ id: users[0].id, forename: users[0].forename, email: users[0].email }]
    );

    res = yield chakram.delete(expectedLocation);
    expect(res).status(204);

    res = yield chakram.get(remindersUrl);
    expect(res).status(200);
    expect(res.body).deep.equal([]);
  });

  it('works using `myself` as user id', function*() {
    const reminder = Object.assign({}, initialReminder);

    reminder.recipients = [{ userId: 'myself' }];

    const timestampBeforeCreation = Date.now();
    const reminderId = yield* api.createReminder(reminder);
    const timestampAfterCreation = Date.now();

    const expectedReminder = {
      id: reminderId,
      action: initialReminder.action,
      due: initialReminder.due,
      status: 'waiting',
    };

    const expectedLocation = `${remindersUrl}/${reminderId}`;

    let res = yield chakram.get(expectedLocation);
    expect(res).status(200);
    assertFullRemindersAreEqual(res.body, expectedReminder,
      timestampBeforeCreation, timestampAfterCreation);

    res = yield chakram.get(`${expectedLocation}/recipients`);
    expect(res).status(200);
    expect(res.body).deep.equal(
      [{ id: users[0].id, forename: users[0].forename, email: users[0].email }]
    );
  });

  it('404 errors', function*() {
    const location = `${remindersUrl}/99999`;
    let res = yield chakram.get(location);
    expect(res).status(404);

    res = yield chakram.put(location, initialReminder);
    expect(res).status(404);

    res = yield chakram.delete(location);
    expect(res).status(404);
  });

  it('GET /reminders', function*() {
    let res = yield chakram.get(remindersUrl);
    expect(res).status(200);
    expect(res.body).deep.equal([]);

    yield chakram.post(remindersUrl, initialReminder);
    res = yield chakram.get(remindersUrl);
    // John is logged in, but the reminder is for Jane
    expect(res.body).lengthOf(0);

    // now logging in with Jane
    yield* api.login(users[1].email, users[1].password);

    res = yield chakram.get(remindersUrl);
    expect(res.body).lengthOf(1);

    yield chakram.post(remindersUrl, initialReminder);
    res = yield chakram.get(remindersUrl);
    expect(res.body).lengthOf(2);

    // now testing the limit parameter
    const promises = [];
    for (let i = 0; i < 20; i++) {
      promises.push(chakram.post(remindersUrl, initialReminder));
    }
    yield promises;

    res = yield chakram.get(remindersUrl);
    expect(res.body).lengthOf(20);

    res = yield chakram.get(`${remindersUrl}?limit=25`);
    expect(res.body).lengthOf(22);

    res = yield chakram.get(`${remindersUrl}?limit=0`);
    expect(res.body).lengthOf(22);
    expect(res.body.every((reminder, i) => reminder.id === i + 1)).true;
  });

  it('GET /reminders?start', function*() {
    const now = Date.now();
    const firstReminder = Object.assign(
      {}, initialReminder,
      { due: now }
    );
    const secondReminder = Object.assign(
      {}, initialReminder,
      { due: now + 10 * 60 * 1000 }
    );

    yield [
      chakram.post(remindersUrl, firstReminder),
      chakram.post(remindersUrl, secondReminder)
    ];

    let res = yield chakram.get(remindersUrl);
    expect(res).status(200);
    // John is logged in, but the reminder is for Jane
    expect(res.body).lengthOf(0);

    // now logging in with Jane
    yield* api.login(users[1].email, users[1].password);

    res = yield chakram.get(remindersUrl);
    expect(res).status(200);
    expect(res.body).lengthOf(2);

    res = yield chakram.get(`${remindersUrl}?start=${now}`);
    expect(res).status(200);
    expect(res.body).lengthOf(2);

    res = yield chakram.get(`${remindersUrl}?start=${now + 1}`);
    expect(res).status(200);
    expect(res.body).lengthOf(1);

    res = yield chakram.get(`${remindersUrl}?start=${now + 11 * 60 * 1000}`);
    expect(res).status(200);
    expect(res.body).deep.equal([]);

    // now testing the limit parameter
    const promises = [];
    for (let i = 0; i < 20; i++) {
      promises.push(chakram.post(remindersUrl, initialReminder));
    }
    yield Promise.all(promises);

    res = yield chakram.get(`${remindersUrl}?start=0`);
    expect(res.body).lengthOf(20);

    res = yield chakram.get(`${remindersUrl}?start=0&limit=25`);
    expect(res.body).lengthOf(22);

    res = yield chakram.get(`${remindersUrl}?start=0&limit=0`);
    expect(res.body).lengthOf(22);
  });

  it('GET /groups/:id/reminders', function*() {
    const group = { name: 'CD_Staff' };
    group.id = yield* api.createGroup(group);

    const timestampBeforeCreation = Date.now();
    yield* api.createReminder(initialReminder);
    const timestampAfterCreation = Date.now();

    const expectedReminder = {
      id: 1,
      action: initialReminder.action,
      due: initialReminder.due,
      status: 'waiting',
      recipients: [{ userId: 2, forename: 'Jane' }]
    };

    const url = `${config.apiRoot}/groups/${group.id}/reminders`;

    // The logged in user is 1; the reminder's recipient is 2.
    // user 1 only is in this group, so we should get no information.
    let res = yield chakram.get(url);
    expect(res.body).deep.equal([]);

    yield* api.addUserToGroup(2, group.id);

    // Now user 1 and 2 are both in this group.
    res = yield chakram.get(url);

    expect(res.body).lengthOf(1);
    assertFullRemindersAreEqual(
      res.body[0], expectedReminder,
      timestampBeforeCreation, timestampAfterCreation
    );

    // now testing the limit parameter
    for (let i = 0; i < 20; i++) {
      yield* api.createReminder(initialReminder);
    }

    res = yield chakram.get(url);
    expect(res.body).lengthOf(20);

    res = yield chakram.get(`${url}?limit=25`);
    expect(res.body).lengthOf(21);

    res = yield chakram.get(`${url}?limit=0`);
    expect(res.body).lengthOf(21);
    expect(res.body.every((reminder, i) => reminder.id === i + 1)).true;

    // Let's login as Alice
    // Alice is not in the group so she should not be able to access it
    yield* api.login(users[2].email, users[2].password);
    res = yield chakram.get(url);
    expect(res).status(404);
  });

  it('GET /groups/:id/reminders?start', function*() {
    const now = Date.now();
    const firstReminder = Object.assign(
      {}, initialReminder,
      { due: now }
    );
    const secondReminder = Object.assign(
      {}, initialReminder,
      { due: now + 10 * 60 * 1000 }
    );

    yield [
      chakram.post(remindersUrl, firstReminder),
      chakram.post(remindersUrl, secondReminder)
    ];

    const group = { name: 'CD_Staff' };
    group.id = yield* api.createGroup(group);
    yield* api.addUserToGroup(2, group.id);

    const url = `${config.apiRoot}/groups/${group.id}/reminders`;

    let res = yield chakram.get(url);
    expect(res).status(200);
    expect(res.body).lengthOf(2);

    res = yield chakram.get(`${url}?start=${now}`);
    expect(res).status(200);
    expect(res.body).lengthOf(2);

    res = yield chakram.get(`${url}?start=${now + 1}`);
    expect(res).status(200);
    expect(res.body).lengthOf(1);

    res = yield chakram.get(`${url}?start=${now + 11 * 60 * 1000}`);
    expect(res).status(200);
    expect(res.body).deep.equal([]);

    // now testing the limit parameter
    const promises = [];
    for (let i = 0; i < 20; i++) {
      promises.push(chakram.post(remindersUrl, initialReminder));
    }
    yield promises;

    res = yield chakram.get(`${url}?start=0`);
    expect(res.body).lengthOf(20);

    res = yield chakram.get(`${url}?start=0&limit=25`);
    expect(res.body).lengthOf(22);

    res = yield chakram.get(`${url}?start=0&limit=0`);
    expect(res.body).lengthOf(22);
  });
});
