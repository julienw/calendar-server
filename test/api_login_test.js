const chakram = require('chakram');
const expect = chakram.expect;

const serverManager = require('./server_manager');
const config = require('./config.js');

describe('/login', function() {

  before(function* () {
    yield serverManager.start();
  });

  after(function* () {
    yield serverManager.stop();
  });

  it('can login', function*() {
    const res = yield chakram.post(
      `${config.apiRoot}/login`,
      { user: 'family_name', password: 'password' }
    );
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
