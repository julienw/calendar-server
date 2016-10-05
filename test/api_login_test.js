const chakram = require('chakram');
const expect = chakram.expect;

const serverManager = require('./server_manager');
const config = require('./config.js');
const api = require('./api_tooling');

describe('/login', function() {
  const user = {
    email: 'Julien@julien.com',
    password: 'Hello World',
    forename: 'Julien',
  };

  beforeEach(function* () {
    yield serverManager.start();
    yield api.createUser(user);
  });

  afterEach(function* () {
    yield serverManager.stop();
  });

  it('can login', function*() {
    const res = yield chakram.post(
      `${config.apiRoot}/login`,
      { email: user.email, password: user.password }
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

  it('can\'t login with bad credentials', function*() {
    let res = yield chakram.post(
      `${config.apiRoot}/login`,
      { email: 'billou@gates.com', password: user.password }
    );

    expect(res).status(401);

    res = yield chakram.post(
      `${config.apiRoot}/login`,
      { email: user.email, password: 'foobar' }
    );

    expect(res).status(401);
  });
});
