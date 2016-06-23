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

  before(function() {
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

  after(function() {
    chakram.clearRequestDefaults();
    return serverManager.stop();
  });

  it('should return an empty list at startup', function() {
    return chakram.get(remindersUrl).then(res => {
      expect(res).status(200);
      expect(res.body).deep.equal([]);
    });
  });

  it('should add a new reminder and make it visible', function() {
    const expectedLocation = `${remindersUrl}/1`;
    const initialReminder = {
      recipient: 'Jane',
      message: 'Pick up kids at school',
      due: Date.now() + 2 * 60 * 60,
    };
    const expectedReminder = Object.assign(
      { id: 1, family: 'family_name' },
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
      expect(res.response.headers.location).deep.equal('/api/v1/reminders/1');

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
});
