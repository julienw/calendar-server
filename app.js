process.env.DEBUG_FD = 1; // debug() echoes to stdout instead of stderr

const express = require('express');
const bodyParser = require('body-parser');
const compression = require('compression');
const cors = require('cors');

const jwt = require('express-jwt');

const config = require('./config');
const database = require('./dao/database');
const notificationsSender = require('./business/notifications');

database.init(config.profile);
notificationsSender.start();

const app = express();

const API_ROOT = config.apiRoot;

app.use(compression());
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.options('*', cors()); // include before other routes

// first check if the requested resource is the login.
app.post(`${API_ROOT}/login`, require('./routes/login'));

// redirect if we're not logged in
app.use(
  jwt({ secret: config.authenticationSecret })
    .unless({ path: [ { url: `${API_ROOT}/users`, methods: 'POST' } ] })
);

// rewrite "myself" with the logged in user id
app.use(require('./routes/myself'));

app.use(`${API_ROOT}/reminders`, require('./routes/reminders'));
app.use(`${API_ROOT}/subscriptions`, require('./routes/subscriptions'));
app.use(`${API_ROOT}/users`, require('./routes/users'));
app.use(`${API_ROOT}/groups`, require('./routes/groups'));

app.use((err, req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  switch(err.name) {
    case 'NotFoundError': break;
    default: console.error(err.stack);
  }

  const errorMessage = {
    error: err.name,
    code: err.code,
    message: err.message,
  };

  if (err.data) {
    errorMessage.data = err.data;
  }

  res.status(err.status || 500).send(errorMessage);
});

const server = app.listen(config.httpPort, () => {
  console.log(`HTTP server listening on port ${config.httpPort}.`);
});


function gracefulExit() {
  console.log('Received exit request. Closing app...');

  new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  }).then(() => notificationsSender.stop())
    .then(() => database.close())
    .then(() => process.exit())
    .catch((err) => {
      console.error('Error while closing app: ', err);
      process.exit(1);
    });
}

process.on('SIGINT', gracefulExit);
process.on('SIGTERM', gracefulExit);
