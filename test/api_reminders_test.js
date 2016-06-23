const chakram = require('chakram');
const expect = chakram.expect;

const config = require('./config.json');

function getCurrentTimestampInSeconds() {
  return Math.floor(Date.now() / 1000);
}

function assertFullRemindersAreEqual(actual, expected,
  timestampBeforeCreation, timestampAfterCreation) {
  expect(actual.created).within(timestampBeforeCreation, timestampAfterCreation);

  // Removed so we don't assert equality on this unknown value
  delete actual.created;
  expect(actual).deep.equal(expected);
}

describe('/reminders', function() {
  const remindersUrl = `${config.apiRoot}/reminders`;
  const defaultReminder = {
    recipient: 'John',
    message: 'Pick up kids at school',
    due: 1466613000,
  };

  before(function() {
    return chakram.post(
      `${config.apiRoot}/login`,
      { user: 'family_name', password: 'password' }
    ).then(res => {
      chakram.setRequestDefaults({
        headers: {
          Authorization: `Bearer ${res.body.token}`
        }
      });
    });
  });

  after(function() {
    chakram.clearRequestDefaults();
  });

  it('should return an empty list at startup', function() {
    return chakram.get(remindersUrl).then(res => {
      expect(res).status(200);
      expect(res.body).deep.equal([]);
    });
  });

  it('should add a new reminder and make it visible', function() {
    const updatedReminder = Object.assign({}, defaultReminder);
    updatedReminder.recipient = 'Jane';
    const expectedLocation = `${remindersUrl}/1`;
    const expectedReminder = {
      due: 1466613000,
      family: 'family_name',
      id: 1,
      message: 'Pick up kids at school',
      recipient: 'John',
    };


    let timestampAfterCreation;
    const timestampBeforeCreation = getCurrentTimestampInSeconds();

    return chakram.post(remindersUrl, defaultReminder).then(res => {
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
      const updatedExpectedReminder = Object.assign({}, expectedReminder);
      updatedExpectedReminder.recipient = 'Jane';

      expect(res).status(200);
      assertFullRemindersAreEqual(res.body, updatedExpectedReminder,
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
