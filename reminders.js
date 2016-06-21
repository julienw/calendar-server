const debug = require('debug')('calendar-server:reminders');

const database = require('./database');

module.exports = {
  index(req, res, next) {
    debug('index');
    database.ready
      .then(db => { console.log(db); return db.all('SELECT * FROM reminders') })
      .then(rows => res.send(rows))
      .catch(err => next(err));
  },

  create(req, res) {
    debug('create');
    res.end();
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
