const chakram = require('chakram');
const co = require('co');
const config = require('./config');
const expect = chakram.expect;

function login(username, password) {
  return co(function*() {
    const res = yield chakram.post(
      `${config.apiRoot}/login`,
      { username, password }
    );

    expect(res).status(200);

    chakram.setRequestDefaults({
      headers: {
        Authorization: `Bearer ${res.body.token}`
      }
    });

    return res.body.token;
  });
}

function logout() {
  chakram.clearRequestDefaults();
  return Promise.resolve();
}

function createUser(user) {
  return co(function*() {
    const res = yield chakram.post(
      `${config.apiRoot}/users`, user
    );

    expect(res).status(201);

    return res.body.id;
  });
}

function createGroup(group) {
  return co(function*() {
    const res = yield chakram.post(
      `${config.apiRoot}/groups`, group
    );

    expect(res).status(201);

    return res.body.id;
  });
}

function addUserToGroup(userId, groupId) {
  return co(function*() {
    const res = yield chakram.put(
      `${config.apiRoot}/groups/${groupId}/members/${userId}`
    );

    expect(res).status(204);
  });
}

function createReminder(reminder) {
  return co(function*() {
    const res = yield chakram.post(`${config.apiRoot}/reminders`, reminder);
    expect(res).status(201);

    return res.body.id;
  });
}

function createSubscription(subscription) {
  return chakram.post(`${config.apiRoot}/subscriptions`, subscription);
}

module.exports = {
  login,
  logout,
  createUser,
  createGroup,
  addUserToGroup,
  createReminder,
  createSubscription,
};
