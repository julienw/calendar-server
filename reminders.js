const debug = require('debug')('calendar-server:reminders');

module.exports = {
  index(req, res) {
    debug('index');
    res.end();
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
