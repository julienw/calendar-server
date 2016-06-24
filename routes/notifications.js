const express = require('express');
const notifications = require('../notifications');

const router = express.Router();

router.post('/', function(req, res, next) {
  notifications.create(req.user.family, req.body).then((id) => {
    res.status(201).location(`${req.baseUrl}/${id}`).end();
  }).catch(next);
});

router.get('/', function(req, res, next) {
  notifications.index(req.user.family).then((rows) => {
    res.send(rows);
  }).catch(next);
});

module.exports = router;
