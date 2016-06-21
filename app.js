const promisify = require('promisify-node');
const express = require('express');
const bodyParser = require('body-parser');
const compression = require('compression');
const cors = require('cors');

const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);

const debug = require('debug')('calendar-server:app');

const reminders = require('./reminders');

const app = express();
const inProduction = app.get('env') === 'production';

const API_ROOT = '/api/v1';
const PORT = 3000;

app.use(compression());
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: 'my precious',
  store: new SQLiteStore,
  resave: false,
  saveUninitialized: false,
  secure: inProduction,
}));

app.options('*', cors()); // include before other routes

/**
 * @param {String} req.body.user Authenticating user
 * @param {String} req.body.password Password for this user
 * @returns {Void}
 */
function login(req, res) {
  const { user, password } = req.body;
  debug('login %s %s', user, password);

  if (user === 'root' && password === 'password') {
    let generateSession = Promise.resolve();
    if (req.session.user) {
      // generate a new session to avoid session fixating issue
      generateSession = promisify(req.session.regenerate)();
    }

    generateSession
      .catch(err => debug('Error while regenerating the session: %s', err))
      .then(() => {
        req.session.user = user;
        res.sendStatus(200);
      });
  } else {
    let destroySession = Promise.resolve();
    if (req.session.user) {
      destroySession = promisify(req.session.destroy)();
    }
    destroySession.then(() => res.sendStatus(401));
  }
}

function logout(req, res) {
  req.session.destroy(() => res.sendStatus(200));
}

// first check if the requested resource is the login.
app.post(`${API_ROOT}/login`, login);
// logout is fine too
app.get(`${API_ROOT}/logout`, logout);

// redirect if we're not logged in
app.use((req, res, next) => {
  if (!req.session.user) {
    res.redirect(`${API_ROOT}/login`);
  } else {
    next();
  }
});

app.route(`${API_ROOT}/reminders`)
  .get(reminders.index)
  .post(reminders.create);
app.route(`${API_ROOT}/reminders/:reminder`)
  .get(reminders.show)
  .delete(reminders.delete)
  .put(reminders.update);

app.get('/', (req, res) => {
  res.send('You may want to use the API instead.');
});

app.listen(PORT, () => {
  console.log('Listening on port 3000.');
});
