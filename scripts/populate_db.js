#!/usr/bin/env node

const request = require('request-promise');


const options = {
  json: true
};
const baseUrl = process.env.TARGET_ENV === 'production'
  ? 'https://calendar.knilxof.org/api/v1'
  : 'http://localhost:3000/api/v1';

const familyName = process.env.FAMILY || 'mozilla';

function login() {
  return request.post({
    url: `${baseUrl}/login`,
    json: true,
    body: { user: familyName, password: 'password' }
  }).then(res => {
    options.headers = {
      Authorization: `Bearer ${res.token}`
    };
  });
}

function insertReminders() {
  const reminders = require('./reminders.json');
  options.url = `${baseUrl}/reminders`;

  const promises = reminders.map(reminder => {
    options.body = reminder;
    return request.post(options);
  });

  return Promise.all(promises);
}

login().then(() =>
  insertReminders()
);
