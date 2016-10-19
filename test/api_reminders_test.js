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
      username: 'john@family.com',
    },
    {
      forename: 'Jane',
      password: 'Hello World',
      username: 'jane@family.com',
    },
    {
      forename: 'Alice',
      password: 'White rabbit',
      username: 'alice@wonderland.me',
    }
  ];

  const group = { name: 'Staff' };

  const initialReminder = {
    recipients: [{ id: 2 }],
    action: 'Pick up kids at school',
    due: Date.now() + 2 * 60 * 60 * 1000,
  };

  beforeEach(function*() {
    yield serverManager.start();
    for (const user of users) {
      user.id = yield api.createUser(user);
    }
    yield api.login(users[0].username, users[0].password);
    group.id = yield api.createGroup(group);
    yield api.addUserToGroup(users[1].id, group.id);
    // users[0] and users[1] are in the same group, users[0] is an admin for
    // this group. users[2] is not in the group.
  });

  afterEach(function*() {
    yield serverManager.stop();
  });

  it('should implement basic CRUD functionality', function*() {
    const expectedLocation = `${remindersUrl}/1`;
    let expectedReminder = {
      id: 1,
      action: initialReminder.action,
      due: initialReminder.due,
      status: 'waiting',
    };

    const updatedReminder = {
      recipients: [{ id: 1 }],
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
    const reminderId = res.body.id;

    res = yield chakram.get(expectedLocation);
    expect(res).status(200);
    assertFullRemindersAreEqual(res.body, expectedReminder,
      timestampBeforeCreation, timestampAfterCreation);

    res = yield chakram.get(`${expectedLocation}/recipients`);
    expect(res).status(200);
    expect(res.body).deep.equal(
      [{
        id: users[1].id,
        forename: users[1].forename,
        username: users[1].username,
      }]
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
      [{
        id: users[0].id,
        forename: users[0].forename,
        username: users[0].username,
      }]
    );

    // checking partial updates
    res = yield chakram.patch(expectedLocation, {});
    expect(res).status(400);

    res = yield chakram.patch(expectedLocation, { due: initialReminder.due });
    expect(res).status(200);
    expectedReminder = {
      id: reminderId,
      action: updatedReminder.action,
      due: initialReminder.due,
      status: 'waiting',
    };
    assertFullRemindersAreEqual(res.body, expectedReminder,
      timestampBeforeCreation, timestampAfterCreation);

    res = yield chakram.patch(
      expectedLocation, { action: initialReminder.action }
    );
    expect(res).status(200);
    expectedReminder = {
      id: reminderId,
      action: initialReminder.action,
      due: initialReminder.due,
      status: 'waiting',
    };
    assertFullRemindersAreEqual(res.body, expectedReminder,
      timestampBeforeCreation, timestampAfterCreation);

    res = yield chakram.patch(
      expectedLocation, {
        action: updatedReminder.action,
        due: updatedReminder.due
      }
    );
    expect(res).status(200);
    expectedReminder = {
      id: reminderId,
      action: updatedReminder.action,
      due: updatedReminder.due,
      status: 'waiting',
    };
    assertFullRemindersAreEqual(res.body, expectedReminder,
      timestampBeforeCreation, timestampAfterCreation);

    // deletes
    res = yield chakram.delete(expectedLocation);
    expect(res).status(204);

    res = yield chakram.get(remindersUrl);
    expect(res).status(200);
    expect(res.body).deep.equal([]);
  });

  it('works using `myself` as user id', function*() {
    const reminder = Object.assign({}, initialReminder);

    reminder.recipients = [{ id: 'myself' }];

    const timestampBeforeCreation = Date.now();
    const reminderId = yield api.createReminder(reminder);
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
      [{
        id: users[0].id,
        forename: users[0].forename,
        username: users[0].username
      }]
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
    yield api.login(users[1].username, users[1].password);

    res = yield chakram.get(remindersUrl);
    expect(res.body).lengthOf(1);
    expect(res.body[0].recipients).deep.equal(
      [{ forename: users[1].forename, id: users[1].id }]
    );

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
    yield api.login(users[1].username, users[1].password);

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
    const timestampBeforeCreation = Date.now();
    yield api.createReminder(initialReminder);
    const timestampAfterCreation = Date.now();

    const expectedReminder = {
      id: 1,
      action: initialReminder.action,
      due: initialReminder.due,
      status: 'waiting',
      recipients: [{ id: 2, forename: 'Jane' }]
    };

    const url = `${config.apiRoot}/groups/${group.id}/reminders`;

    // NOTE TODO: to test this with the current code we need to have an API to
    // remove somebody from a group -- which we don't have yet. So we can't be
    // in this situation with the current checks in place.
    /*
    // The logged in user is 1; the reminder's recipient is 2.
    // user 1 only is in this group, so we should get no information.
    let res = yield chakram.get(url);
    expect(res.body).deep.equal([]);

    yield api.addUserToGroup(2, group.id);
    */

    // Now user 1 and 2 are both in this group.
    let res = yield chakram.get(url);

    expect(res.body).lengthOf(1);
    assertFullRemindersAreEqual(
      res.body[0], expectedReminder,
      timestampBeforeCreation, timestampAfterCreation
    );

    // now testing the limit parameter
    for (let i = 0; i < 20; i++) {
      yield api.createReminder(initialReminder);
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
    yield api.login(users[2].username, users[2].password);
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

  it('DELETE /reminders/:id/recipients/myself', function*() {
    yield api.addUserToGroup(users[2].id, group.id);

    const reminder = {
      recipients: [{ id: 2 }, { id: 3 }],
      action: 'Pick up kids at school',
      due: Date.now() + 2 * 60 * 60 * 1000,
    };

    const reminderId = yield api.createReminder(reminder);
    const reminderLocation = `${remindersUrl}/${reminderId}`;

    let res = yield chakram.get(`${reminderLocation}/recipients`);
    expect(res).status(200);
    expect(res.body).include({
      id: users[1].id,
      forename: users[1].forename,
      username: users[1].username,
    });
    expect(res.body).include({
      id: users[2].id,
      forename: users[2].forename,
      username: users[2].username,
    });

    // we're logged in as user 1 (which is users[0])
    // we shouldn't be able to delete a recipient
    res = yield chakram.delete(`${reminderLocation}/recipients/myself`);
    expect(res).status(404);
    res = yield chakram.delete(`${reminderLocation}/recipients/2`);
    expect(res).status(403);

    // let's log in as user 2 then
    yield api.login(users[1].username, users[1].password);
    res = yield chakram.delete(`${reminderLocation}/recipients/myself`);
    expect(res).status(204);

    res = yield chakram.get(`${reminderLocation}`);
    expect(res).status(200);

    // Now check that removing all recipients deletes the reminder itself
    yield api.login(users[2].username, users[2].password);
    res = yield chakram.get(`${reminderLocation}`);
    expect(res).status(200);
    res = yield chakram.delete(`${reminderLocation}/recipients/myself`);
    expect(res).status(204);
    res = yield chakram.get(`${reminderLocation}`);
    expect(res).status(404);
  });

  it('Permission checks', function*() {
    const forbiddenReminder = Object.assign(
      {},
      initialReminder,
      { recipients: [{ id: 3 }] }
    );

    const modifiedReminder = Object.assign(
      {},
      initialReminder,
      { recipients: [{ id: 1 }] }
    );

    let res = yield chakram.post(remindersUrl, forbiddenReminder);
    expect(res).status(403);

    const reminderId = yield api.createReminder(initialReminder);
    const reminderUrl = `${remindersUrl}/${reminderId}`;

    res = yield chakram.put(reminderUrl, forbiddenReminder);
    expect(res).status(403);

    yield api.login(users[2].username, users[2].password);

    res = yield chakram.get(reminderUrl);
    expect(res).status(404);

    res = yield chakram.get(`${reminderUrl}/recipients`);
    expect(res).status(404);

    res = yield chakram.put(reminderUrl, modifiedReminder);
    expect(res).status(404);

    res = yield chakram.delete(reminderUrl);
    expect(res).status(404);

    yield api.login(users[1].username, users[1].password);
    res = yield chakram.delete(reminderUrl);
    expect(res).status(403);
  });
});
