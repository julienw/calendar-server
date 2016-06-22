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
  .get(reminders.index)
  .post((req, res, next) => {
    reminders.create(req.body, req.user.family).then((id) => {
      debug('reminder with ID %s has been created in database', id);
      res.status(201).location(`${API_ROOT}/reminders/${id}`).end();
    }).catch((e) => {
      console.error(e.stack);
      next(e);
    });
  });
app.route(`${API_ROOT}/reminders/:reminder`)
  .get(reminders.show)
  .delete(reminders.delete)
  .put(reminders.update);

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
