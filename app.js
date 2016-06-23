const express = require('express');
const bodyParser = require('body-parser');
const compression = require('compression');
const cors = require('cors');

const jwt = require('express-jwt');

const debug = require('debug')('calendar-server:app');

const reminders = require('./reminders');
const login = require('./login');

const app = express();

const API_ROOT = '/api/v1';
const PORT = 3000;

require('./database').init();

app.use(compression());
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.options('*', cors()); // include before other routes

// first check if the requested resource is the login.
app.post(`${API_ROOT}/login`, login);

// redirect if we're not logged in
app.use(jwt({ secret: 'some secret that you should configure' }));

app.route(`${API_ROOT}/reminders`)
  .get((req, res, next) => {
    reminders.index(req.user.family, req.query.start, req.query.limit)
      .then(rows => res.send(rows))
      .catch(next);
  })
  .post((req, res, next) => {
    reminders.create(req.user.family, req.body).then((id) => {
      debug('reminder with ID %s has been created in database', id);
      res.status(201).location(`${API_ROOT}/reminders/${id}`).end();
    }).catch(next);
  });

app.route(`${API_ROOT}/reminders/:reminder`)
  .get((req, res, next) => {
    reminders.show(req.user.family, req.params.reminder).then((reminder) => {
      debug('found reminder %o', reminder);
      res.send(reminder);
    }).catch(next);
  })
  .delete((req, res, next) => {
    reminders.delete(req.user.family, req.params.reminder)
      .then(() => res.status(204).end())
      .catch(next);
  })
  .put((req, res, next) => {
    reminders.update(req.user.family, req.params.reminder, req.body)
      .then(() => res.status(204).end())
      .catch(next);
  });

app.get('/', (req, res) => {
  res.send('You may want to use the API instead.');
});

app.use((err, req, res, _next) => {
  console.error(err.stack);
  res.status(err.status || 500).send(
    { error: err.name, code: err.code, message: err.message }
  );
});

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}.`);
});
