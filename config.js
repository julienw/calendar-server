const path = require('path');
const shush = require('shush');


function getUserConfig() {
  const USER_CONFIG_PATH = './config/config.json';
  let userConfig = {};

  try {
    userConfig = shush(USER_CONFIG_PATH);
  } catch (e) {
    if (e.code === 'MODULE_NOT_FOUND') {
      console.warn(`No config found at "${USER_CONFIG_PATH}". Continuing...`);
    } else {
      throw e;
    }
  }

  if (userConfig.profile) {
    userConfig.profile = path.join(__dirname, userConfig.profile);
  }

  return userConfig;
}


const config = require('minimist')(
  process.argv.slice(2),
  {
    default: Object.assign({
      apiRoot: '/api/v1',
      httpPort: 3000,
      mqPort: 4000,
      notificationPoll: 60 * 1000,
      profile: path.join(__dirname, 'profiles/development'),
      authenticationSecret: 'some secret that you should configure'
    }, getUserConfig())
  }
);

if (!path.isAbsolute(config.profile)) {
  config.profile = path.join(process.cwd(), config.profile);
}

require('mkdirp').sync(config.profile);

module.exports = config;
