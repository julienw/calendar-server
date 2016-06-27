/* eslint-disable no-unused-expressions */
const chakram = require('chakram');
const expect = chakram.expect;

const serverManager = require('./server_manager');
const config = require('./config.js');

function getCurrentTimestampInSeconds() {
  return Math.floor(Date.now() / 1000);
}

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
  const remindersUrl = `${config.apiRoot}/reminders`;

  const initialReminder = {
    recipient: 'Jane',
    message: 'Pick up kids at school',
    due: Date.now() + 2 * 60 * 60,
  };

  beforeEach(function() {
    return serverManager.start()
      .then(() => chakram.post(
        `${config.apiRoot}/login`,
        { user: 'family_name', password: 'password' }
      )).then(res => {
        chakram.setRequestDefaults({
          headers: {
            Authorization: `Bearer ${res.body.token}`
          }
        });
      });
  });

  afterEach(function() {
    chakram.clearRequestDefaults();
    return serverManager.stop();
  });

  it('should implement basic CRUD functionality', function() {
    const expectedLocation = `${remindersUrl}/1`;
    const expectedReminder = Object.assign(
      { id: 1 },
      initialReminder
    );
    const updatedReminder = {
      recipient: 'John',
      message: 'Go shopping',
      due: Date.now() + 4 * 60 * 60,
    };
    const expectedUpdatedReminder = Object.assign(
      {}, expectedReminder, updatedReminder
    );


    let timestampAfterCreation;
    const timestampBeforeCreation = getCurrentTimestampInSeconds();

    return chakram.post(remindersUrl, initialReminder).then(res => {
      timestampAfterCreation = getCurrentTimestampInSeconds();
      expect(res).status(201);
      expect(res).header('location', '/api/v1/reminders/1');

      return chakram.get(expectedLocation);
    }).then(res => {
      expect(res).status(200);
      assertFullRemindersAreEqual(res.body, expectedReminder,
        timestampBeforeCreation, timestampAfterCreation);

      return chakram.put(expectedLocation, updatedReminder);
    }).then(res => {
      expect(res).status(204);

      return chakram.get(expectedLocation);
    }).then(res => {
      expect(res).status(200);
      assertFullRemindersAreEqual(res.body, expectedUpdatedReminder,
        timestampBeforeCreation, timestampAfterCreation);

      return chakram.delete(expectedLocation);
    }).then(res => {
      expect(res).status(204);

      return chakram.get(remindersUrl);
    }).then(res => {
      expect(res.body).deep.equal([]);
    });
  });

  it('404 errors', function() {
    const location = `${remindersUrl}/99999`;
    return chakram.get(location).then(res => {
      expect(res).status(404);

      return chakram.put(location, {});
    }).then(res => {
      expect(res).status(404);

      return chakram.delete(location);
    }).then(res => {
      expect(res).status(404);
    });
  });

  it('GET /reminders', function() {
    return chakram.get(remindersUrl).then(res => {
      expect(res).status(200);
      expect(res.body).deep.equal([]);

      return chakram.post(remindersUrl, initialReminder);
    }).then(
      () => chakram.get(remindersUrl)
    ).then(res => {
      expect(res.body).lengthOf(1);

      return chakram.post(remindersUrl, initialReminder);
    }).then(
      () => chakram.get(remindersUrl)
    ).then(res => {
      expect(res.body).lengthOf(2);

      const promises = [];
      for (let i = 0; i < 20; i++) {
        promises.push(chakram.post(remindersUrl, initialReminder));
      }
      return Promise.all(promises);
    }).then(
      () => chakram.get(remindersUrl)
    ).then(res => {
      expect(res.body).lengthOf(20);

      return chakram.get(`${remindersUrl}?limit=25`);
    }).then(res => {
      expect(res.body).lengthOf(22);

      return chakram.get(`${remindersUrl}?limit=0`);
    }).then(res => {
      expect(res.body).lengthOf(22);

      expect(res.body.every((reminder, i) => reminder.id === i + 1)).true;
    });
  });
});
