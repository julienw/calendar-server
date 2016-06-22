const debug = require('debug')('calendar-server:database');

const sqlite3 = require('sqlite3').verbose();

const DB_VERSION = 1;

const db = new sqlite3.Database('reminders.db', (err) => {
  if (err) {
    console.error('Error while opening the sqlite database', err);
  }
});

const versionCreateStatement = `
  CREATE TABLE IF NOT EXISTS version
  (
    version INTEGER DEFAULT 0
  )
`;

function shouldMigrate() {
  return new Promise((resolve) => {
    db.serialize(() => {
      db.run(versionCreateStatement);
      db.get('SELECT version FROM version', (err, row) => {
        if (err) {
          console.error('Error while selecting the sqlite database', err);
          return;
        }

        let version;
        if (row) {
          version = row.version;
        }

        resolve(version < DB_VERSION);
      });
    });
  });
}

function updateVersion() {
  db.serialize(() => {
    db.run('DELETE FROM version');
    db.run('INSERT INTO version (version) VALUES (?)', DB_VERSION);
  });
}

const createStatement = `
  CREATE TABLE IF NOT EXISTS reminders
  (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    family TEXT,
    recipient TEXT,
    message TEXT,
    created_timestamp INTEGER DEFAULT CURRENT_TIMESTAMP,
    due_timestamp INTEGER NOT NULL
  )
`;

const readyPromise = shouldMigrate().then(shouldMigrate => {
  // we don't care
  debug('Should we migrate ? %s', shouldMigrate);
  return updateVersion();
}).then(() => {
  db.run(createStatement, () => console.log('created !'));
});

const promisedDb = {
  all(...args) {
    return new Promise((resolve, reject) => {
      db.all(...args, (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(rows);
      });
    });
  },
  run(...args) {
    return new Promise((resolve, reject) => {
      // Cannot use arrow function because `this` is set by the caller
      db.run(...args, function(err) {
        if (err) {
          reject(err);
          return;
        }
        resolve(this.lastID);
      });
    });
  }
};

module.exports = {
  ready: readyPromise.then(() => promisedDb)
};
