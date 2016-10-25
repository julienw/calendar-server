const path = require('path');

const httpPort = 3001;
const mqPort = 4001;
const profilePath = path.join(__dirname, '../profiles/test');

module.exports = {
  httpPort,
  mqPort,
  apiRoot: `http://localhost:${httpPort}/api/v2`,
  profilePath,
  masterPassword: 'MASTER_PASSWORD',
};
