const debug = require('debug')('calendar-server:database');
const path = require('path');

const sqlite3 = require('sqlite3').verbose();
const deferred = require('../utils/deferred');

const { InternalError, NotFoundError } = require('../utils/errors');

let db;

function nodeToPromise(resolve, reject) {
  return function(err, res) {
    if (err) {
      reject(err);
      return;
    }
    resolve(res);
  };
}

function run(...args) {
  return new Promise((resolve, reject) => {
    // Cannot use arrow function because `this` is set by the caller
    db.run(...args, function(err) {
      if (err) {
        reject(err);
        return;
      }
      resolve({ lastId: this.lastID, changes: this.changes });
    });
  });
}

function safeUpdateOrDelete(mode, ...args) {
  args[0] = `${mode} ${args[0]}`;
  debug('statement: `%s`', args[0]);

  return run(...args).then((result) => {
    if (result.changes === 0) {
      throw new NotFoundError(
        'no_row_changed',
        `Nothing was ${mode}d in the database. Statement was: \`${args[0]}\``
      );
    }

    if (result.changes > 1) {
      throw new InternalError(
        'database_corrupted',
        `More than 1 row has been ${mode}d.`
      );
    }
  });
}

const promisedDb = {
  all(...args) {
    return new Promise(
      (resolve, reject) => db.all(...args, nodeToPromise(resolve, reject))
    );
  },

  run,

  exec(statement) {
    return new Promise(
      (resolve, reject) => db.exec(statement, nodeToPromise(resolve, reject))
    );
  },

  get(...args) {
    return new Promise(
      (resolve, reject) => db.get(...args, nodeToPromise(resolve, reject))
    );
  },

  update(...args) {
    return safeUpdateOrDelete('update', ...args);
  },

  delete(...args) {
    return safeUpdateOrDelete('delete', ...args);
  }
};

const readyDeferred = deferred();

// NOTE: members_reminders(member_id) has no ON DELETE CASCADE because we need
// to manually cascade to reminders if there is no more recipients associated to
// a reminder.
const createStatements =
`
  CREATE TABLE IF NOT EXISTS families
  (
    name TEXT PRIMARY KEY
  );

  CREATE TABLE IF NOT EXISTS members
  (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    family TEXT NOT NULL
      REFERENCES families(name)
      ON UPDATE CASCADE
      ON DELETE CASCADE
      DEFERRABLE INITIALLY DEFERRED,
    name TEXT NOT NULL,
    UNIQUE (family, name)
  );

  CREATE TABLE IF NOT EXISTS members_families
  (
    member_id INTEGER NOT NULL
      REFERENCES members(id)
      ON UPDATE CASCADE
      ON DELETE CASCADE
      DEFERRABLE INITIALLY DEFERRED,
    family_name TEXT NOT NULL
      REFERENCES families(name)
      ON UPDATE CASCADE
      ON DELETE CASCADE
      DEFERRABLE INITIALLY DEFERRED,
    accepted BOOLEAN,
    PRIMARY KEY (member_id, family_name)
  );
  CREATE INDEX IF NOT EXISTS members_families_family
    ON members_families (family_name);

  CREATE TABLE IF NOT EXISTS reminders
  (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT,
    created INTEGER NOT NULL, -- in milliseconds
    due INTEGER NOT NULL, -- in milliseconds
    status TEXT DEFAULT 'waiting'
  );
  CREATE INDEX IF NOT EXISTS reminders_due
    ON reminders(due);
  CREATE INDEX IF NOT EXISTS reminders_status
    ON reminders(status);

  CREATE TABLE IF NOT EXISTS members_reminders
  (
    member_id INTEGER NOT NULL
      REFERENCES members(id)
      ON UPDATE CASCADE
      DEFERRABLE INITIALLY DEFERRED,
    reminder_id INTEGER NOT NULL
      REFERENCES reminders(id)
      ON UPDATE CASCADE
      ON DELETE CASCADE
      DEFERRABLE INITIALLY DEFERRED,
    PRIMARY KEY (member_id, reminder_id)
  );
  CREATE INDEX IF NOT EXISTS members_reminders_reminder_id
    ON members_reminders(reminder_id);

  CREATE TABLE IF NOT EXISTS subscriptions
  (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER NOT NULL
      REFERENCES members(id)
      ON UPDATE CASCADE
      ON DELETE CASCADE
      DEFERRABLE INITIALLY DEFERRED,
    title TEXT,
    endpoint TEXT UNIQUE,
    p256dh TEXT,
    auth TEXT
  );
  CREATE INDEX IF NOT EXISTS subscriptions_member_id
    ON subscriptions(member_id);
`;

function init(profileDir) {
  const dbPath = path.join(profileDir, 'reminders.db');

  // Promise chain is only used in tests. The rest of the code base uses
  // database.ready. This is due to historical reasons: we first decided to use
  // deferred, but multiple database connection done in tests probably hide
  // errors. That why promises are now explicitly returned.. If you are willing
  // to change this function, and now you're reading this comment:
  // please do so :)
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(dbPath, (err) => (err ? reject(err) : resolve()));
  }).then(
    () => promisedDb.exec(createStatements)
  ).then(
    readyDeferred.resolve,
    (err) => {
      console.error(`Error while initializing the sqlite database. \
database.ready might not be ever resolved. Error: ${err}`);
      readyDeferred.reject(err);
      throw err;
    });
}

function close() {
  return new Promise((resolve, reject) => {
    db.close((err) => (err ? reject(err) : resolve()));
  });
}

module.exports = {
  init,
  close,
  ready: readyDeferred.promise.then(() => promisedDb)
};
