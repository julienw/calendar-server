const chakram = require('chakram');
const expect = chakram.expect;

const serverManager = require('./server_manager');
const config = require('./config.js');

describe('/login', function() {

  before(function() {
    return serverManager.start();
  });

  after(function() {
    return serverManager.stop();
  });

  it('can login', function() {
    return chakram.post(
      `${config.apiRoot}/login`,
      { user: 'family_name', password: 'password' }
    ).then(res => {
      expect(res).status(200);
      expect(res).schema({
        type: 'object',
        properties: {
          token: {
            type: 'string'
          }
        }
      });
    });
  });
});
