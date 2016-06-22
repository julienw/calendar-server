const debug = require('debug')('calendar-server:reminders');

const database = require('./database');
const { InvalidInputError } = require('./errors');

function checkPropertyType(obj, prop, type) {
  if (typeof obj[prop] !== type) {
    throw new InvalidInputError('invalid_type', `${prop} should be a ${type}`);
  }
}

module.exports = {
  index(req, res, next) {
    debug('index');
    database.ready
      .then(db => db.all('SELECT * FROM reminders'))
      .then(rows => res.send(rows))
      .catch(err => next(err));
  },

  create(reminder, family) {
    debug('create %o %s', reminder, family);
    checkPropertyType(reminder, 'recipient', 'string');
    checkPropertyType(reminder, 'message', 'string');
    checkPropertyType(reminder, 'due', 'number');

    return database.ready.then(db => {
      return db.run(
        `INSERT INTO reminders
          (recipient, message, due_timestamp, family)
          VALUES (?, ?, ?, ?)`,
        reminder.recipient,
        reminder.message,
        reminder.due,
        family
      );
    });
  },

  // takes a `reminder` id as parameter
  show(req, res) {
    debug('show %s', req.params.reminder);
    res.end();
  },

  // takes a `reminder` id as parameter
  delete(req, res) {
    debug('delete %s', req.params.reminder);
    res.end();
  },

  // takes a `reminder` id as parameter
  update(req, res) {
    debug('update %s', req.params.reminder);
    res.end();
  },
};
