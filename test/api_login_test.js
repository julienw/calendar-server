const chakram = require('chakram');
const expect = chakram.expect;

describe('/login', function() {
  it('can login', function() {
    return chakram.post(
      'http://localhost:3000/api/v1/login',
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

