const debug = require('debug')('DEBUG:calendar-server:routes/myself');
const express = require('express');
const router = express.Router();

const myselfRe = /\bmyself\b/g;
router.use((req, res, next) => {
  if (req.user && myselfRe.test(req.url)) {
    debug(`Replacing 'myself' with ${req.user.id}`);
    req.url = req.url.replace(myselfRe, req.user.id);
  }
  next();
});

module.exports = router;
