const debug = require('debug')('calendar-server:reminders');

const database = require('./database');
const { InvalidInputError } = require('./errors');

function checkPropertyType(obj, prop, type) {
  if (typeof obj[prop] !== type) {
    throw new InvalidInputError(
      'invalid_type', `"${prop}" should be a ${type}`
    );
  }
}

module.exports = {
  index(family, start = Math.floor(Date.now() / 1000), limit = 20) {

    // force parameters as integer
    start = +start;
    limit = +limit;

    debug('index family=%s start=%s limit=%s', family, start, limit);

    if (Number.isNaN(start)) {
      throw new InvalidInputError('invalid_type', '"start" should be a number');
    }

    if (Number.isNaN(limit)) {
      throw new InvalidInputError('invalid_type', '"limit" should be a number');
    }

    let statement = 'SELECT * FROM reminders WHERE family = ? AND due > ?';
    const statementArgs = [ family, start ];
    if (limit) {
      statement += ' LIMIT ?';
      statementArgs.push(limit);
    }
    debug('statement is %s', statement);
    return database.ready
      .then(db => db.all(statement, ...statementArgs));
  },

  create(family, reminder) {
    debug('create reminder %o for family %s', reminder, family);
    checkPropertyType(reminder, 'recipient', 'string');
    checkPropertyType(reminder, 'message', 'string');
    checkPropertyType(reminder, 'due', 'number');

    return database.ready.then(db => {
      return db.run(
        `INSERT INTO reminders
          (recipient, message, due, family)
          VALUES (?, ?, ?, ?)`,
        reminder.recipient,
        reminder.message,
        reminder.due,
        family
      );
    });
  },

  // takes a `reminder` id as parameter
  show(family, reminderId) {
    debug('show reminder #%s for family %s', reminderId, family);

    return database.ready
      .then(db => db.get(
        'SELECT * FROM reminders WHERE family = ? AND id = ?',
        family, reminderId
      ));
  },

  // takes a `reminder` id as parameter
  delete(family, reminderId) {
    debug('delete reminder #%s for family %s', reminderId, family);
    return database.ready
      .then(db => db.run(
        'DELETE FROM reminders WHERE family = ? AND id = ?',
        family, reminderId
      ));
  },

  // takes a `reminder` id as parameter
  update(req, res) {
    debug('update %s', req.params.reminder);
    res.end();
  },
};
