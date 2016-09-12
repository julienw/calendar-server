const chakram = require('chakram');
const config = require('./config');
const expect = chakram.expect;

function* login(email, password) {
  const res = yield chakram.post(
    `${config.apiRoot}/login`,
    { email, password }
  );

  expect(res).status(200);

  chakram.setRequestDefaults({
    headers: {
      Authorization: `Bearer ${res.body.token}`
    }
  });

  return res.body.token;
}

function logout() {
  chakram.clearRequestDefaults();
}

function* createUser(user) {
  const res = yield chakram.post(
    `${config.apiRoot}/users`, user
  );

  expect(res).status(201);

  return res.body.id;
}

function* createGroup(group) {
  const res = yield chakram.post(
    `${config.apiRoot}/groups`, group
  );

  expect(res).status(201);

  return res.body.id;
}

function* addUserToGroup(userId, groupId) {
  const res = yield chakram.put(
    `${config.apiRoot}/groups/${groupId}/members/${userId}`
  );

  expect(res).status(204);
}

function* createReminder(reminder) {
  const res = yield chakram.post(`${config.apiRoot}/reminders`, reminder);
  expect(res).status(201);

  return res.body.id;
}

function* createSubscription(subscription) {
  yield chakram.post(`${config.apiRoot}/subscriptions`, subscription);
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
