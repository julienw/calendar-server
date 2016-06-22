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
  index(start = Math.floor(Date.now() / 1000), limit = 20) {

    // force parameters as integer
    start = +start;
    limit = +limit;

    debug('index start=%s limit=%s', start, limit);

    if (Number.isNaN(start)) {
      throw new InvalidInputError('invalid_type', '"start" should be a number');
    }

    if (Number.isNaN(limit)) {
      throw new InvalidInputError('invalid_type', '"limit" should be a number');
    }

    let statement = 'SELECT * FROM reminders WHERE due > ?';
    const statementArgs = [ start ];
    if (limit) {
      statement += ' LIMIT ?';
      statementArgs.push(limit);
    }
    debug('statement is %s', statement);
    return database.ready
      .then(db => db.all(statement, ...statementArgs));
  },

  create(reminder, family) {
    debug('create %o %s', reminder, family);
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
  show(reminderId) {
    debug('show %s', reminderId);

    return database.ready
      .then(db => db.get('SELECT * FROM reminders where id = ?', reminderId));
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
