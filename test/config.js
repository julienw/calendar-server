const port = require('./server_manager').port;

module.exports = {
  apiRoot: `http://localhost:${port}/api/v1`
};
