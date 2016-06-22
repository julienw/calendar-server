const chakram = require('chakram');
const expect = chakram.expect;

const config = require('./config.json');

describe('/login', function() {
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

