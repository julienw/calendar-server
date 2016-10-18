const chakram = require('chakram');
const expect = chakram.expect;

const { testData } = require('../dao/schema');
const db = require('../dao/database');
const reminders = require('../dao/reminders');
const serverManager = require('./server_manager');
const config = require('./config');

describe('dao', () => {
  beforeEach(function*() {
    // Reset the database state between each test run
    serverManager.reinitProfile();
    yield db.init(config.profilePath);
    const dbInstance = yield db.ready;
    yield dbInstance.exec(testData);
  });

  describe('reminders', function() {
    describe('getAllForUserByStart(groupId, start, limit)', function() {
      it('should return reminders by start value', function*() {
        const result = yield reminders.getAllForUserByStart(
          1, 1470839863000, 2
        );

        expect(result).lengthOf(1);
        expect(result[0].action).to.equal('attend important meeting');
        expect(result[0].id).equal(1);

        const recipients = yield reminders.getRecipients(result[0].id);
        expect(recipients).deep.equal([
          { id: 1, forename: 'Ana', username: 'email@email.com' },
          {
            id: 2,
            forename: 'Bob',
            username: 'a@email.com',
            phoneNumber: '1234567890',
          },
        ]);
      });
    });

    describe('getAllForUserByStatus(groupId, status, limit)', function() {
      it('should return reminders by status', function*() {
        const result = yield reminders.getAllForUserByStatus(1, 'waiting', 2);

        expect(result).lengthOf(1);
        expect(result[0].action).to.equal('attend important meeting');
        expect(result[0].id).equal(1);
      });
    });

    describe('create(reminder)', function() {
      it('should create a new reminder in the database and' +
        ' associate with users', function*() {
        const result = yield reminders.create({
          recipients: [ { userId: 1 }, { userId: 2 }],
          action: 'pick up from school',
          due: 1470839865000
        });
        expect(result).equal(2);
      });
    });

    describe('show(groupId, id)', function() {
      it('should show a reminder with a specific ID', function*() {
        const reminder = yield reminders.show(1);
        expect(reminder.action).to.equal('attend important meeting');
        const recipients = yield reminders.getRecipients(1);
        expect(recipients).deep.equal([
          { id: 1, forename: 'Ana', username: 'email@email.com' },
          {
            id: 2,
            forename: 'Bob',
            username: 'a@email.com',
            phoneNumber: '1234567890',
          },
        ]);
      });
    });

    describe('delete(groupId, id)', function() {
      it('should delete a reminder with a specific ID', function*() {
        yield reminders.delete(1);

        try {
          yield reminders.show(1);
          throw new Error('Expected reminder to be deleted');
        } catch (error) {
          expect(error.message).to.equal('The reminder with id `1` ' +
            'does not exist.');
        }
      });
    });

    describe('update(groupId, id, updatedReminder', function() {
      it('should update a reminder, removing recipients and ' +
        'adding recipients if necessary', function*() {
        yield reminders.update(1, {
          action: 'dinner with friends',
          due: 100,
          recipients: [ { userId: 1 }, { userId: 3 } ]
        });
        const reminder = yield reminders.show(1);
        expect(reminder.action).to.equal('dinner with friends');
        const recipients = yield reminders.getRecipients(1);
        expect(recipients).deep.equal([
          { id: 1, forename: 'Ana', username: 'email@email.com' },
          {
            id: 3,
            forename: 'Sam',
            username: 'b@email.com',
            phoneNumber: '2345678901',
          },
        ]);
      });
    });

    describe('findAllDueReminders(now)', function() {
      it('should find all reminders due by time "now"', function*() {
        const result = yield reminders.findAllDueReminders(9999999999000);
        expect(result).deep.equal([
          {
            action: 'attend important meeting',
            created: 1470839864000,
            due: 1470926264000,
            id: 1,
            status: 'waiting',
          }
        ]);
      });
    });
  });
});
