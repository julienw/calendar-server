// NOTE: members_reminders(member_id) has no ON DELETE CASCADE because we need
// to manually cascade to reminders if there is no more recipients associated to
// a reminder.
const schema = `
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS "group" (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      name VARCHAR(128) NOT NULL
  );

  CREATE TABLE IF NOT EXISTS user_group (
    user_id INTEGER NOT NULL,
    group_id INTEGER NOT NULL,
    is_admin INTEGER NOT NULL,
    FOREIGN KEY (user_id)
      REFERENCES user (id)
      ON DELETE CASCADE
      ON UPDATE CASCADE
      DEFERRABLE INITIALLY DEFERRED,
    FOREIGN KEY (group_id)
      REFERENCES "group" (id)
      ON DELETE CASCADE
      ON UPDATE CASCADE
      DEFERRABLE INITIALLY DEFERRED
  );

  CREATE TABLE IF NOT EXISTS user (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    forename VARCHAR(128) NOT NULL,
    email VARCHAR(256) NOT NULL UNIQUE,
    password_hash VARCHAR(128) NOT NULL
  );

  CREATE TABLE IF NOT EXISTS reminder (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    "action" TEXT NOT NULL,
    created INTEGER NOT NULL, -- in milliseconds
    due INTEGER NOT NULL, -- in milliseconds
    status VARCHAR(128) DEFAULT('waiting')
  );

  CREATE TABLE IF NOT EXISTS user_reminder
  (
    user_id INTEGER NOT NULL,
    reminder_id INTEGER NOT NULL,
    PRIMARY KEY (user_id, reminder_id),
    FOREIGN KEY (user_id)
      REFERENCES user(id)
-- no ON DELETE because we want to force the code to delete reminders as well
      ON UPDATE CASCADE
      DEFERRABLE INITIALLY DEFERRED,
    FOREIGN KEY (reminder_id)
      REFERENCES reminder(id)
      ON UPDATE CASCADE
      ON DELETE CASCADE
      DEFERRABLE INITIALLY DEFERRED
  );

  CREATE INDEX IF NOT EXISTS user_reminder_id
    ON user_reminder(reminder_id);

  CREATE TABLE IF NOT EXISTS subscription
  (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL
      REFERENCES user(id)
      ON UPDATE CASCADE
      ON DELETE CASCADE
      DEFERRABLE INITIALLY DEFERRED,
    title TEXT,
    endpoint TEXT UNIQUE,
    p256dh TEXT,
    auth TEXT
  );
  CREATE INDEX IF NOT EXISTS subscription_user_id
    ON subscription(user_id);
`;

/* eslint-disable max-len */
const testData = `
  DELETE FROM user;
  INSERT INTO
    user (forename, email, password_hash)
  VALUES
    ("Ana", "email@email.com",
     "$argon2i$v=19$m=4096,t=3,p=1$6xrsrimi0fCbwmMuiu9/lg$CHF6oMYRFa9sGbaRmrrK4Ev/gtNr4EQSoWZzi4S+J4c");

  INSERT INTO
    user (forename, email, password_hash)
  VALUES
    ("Bob", "a@email.com",
    "$argon2i$v=19$m=4096,t=3,p=1$6xrsrimi0fCbwmMuiu9/lg$CHF6oMYRFa9sGbaRmrrK4Ev/gtNr4EQSoWZzi4S+J4c");

  INSERT INTO
    user (forename, email, password_hash)
  VALUES
    ("Sam", "b@email.com",
    "$argon2i$v=19$m=4096,t=3,p=1$6xrsrimi0fCbwmMuiu9/lg$CHF6oMYRFa9sGbaRmrrK4Ev/gtNr4EQSoWZzi4S+J4c");

  DELETE FROM "group";
  INSERT INTO
    "group" (name)
  VALUES
    ("Smith");
  INSERT INTO
    "group" (name)
  VALUES
    ("B");

  DELETE FROM user_group;
  INSERT INTO
    user_group (user_id, group_id, is_admin)
  VALUES
    (1, 1, 1);
  INSERT INTO
    user_group (user_id, group_id, is_admin)
  VALUES
    (2, 1, 0);
  INSERT INTO
    user_group (user_id, group_id, is_admin)
  VALUES
    (3, 1, 0);
  INSERT INTO
    user_group (user_id, group_id, is_admin)
  VALUES
    (1, 2, 0);

  DELETE FROM reminder;
  INSERT INTO
    reminder ("action", created, due, status)
  VALUES
    ("attend important meeting", 1470839864000, 1470926264000, "waiting");

  DELETE FROM user_reminder;
  INSERT INTO
    user_reminder (user_id, reminder_id)
  VALUES
    (1, 1);
  INSERT INTO
    user_reminder (user_id, reminder_id)
  VALUES
    (2, 1);

  DELETE FROM subscription;
  INSERT INTO
    subscription (user_id, title, endpoint, p256dh, auth)
  VALUES
    (1, "Samsung", "some_endpoint", "some_p256dh", "some_auth");
`;
/* eslint-enable max-len */

module.exports = {
  schema,
  testData,
};
