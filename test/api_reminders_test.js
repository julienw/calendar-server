const chakram = require('chakram');
const expect = chakram.expect;

const config = require('./config.json');

describe('/reminders', function() {
  before(function() {
    return chakram.post(
      `${config.apiRoot}/login`,
      { user: 'family_name', password: 'password' }
    ).then(res => {
      chakram.setRequestDefaults({
        headers: {
          Authorization: `Bearer ${res.body.token}`
        }
      });
    });
  });

  after(function() {
    chakram.clearRequestDefaults();
  });

  it('should return an empty list at startup', function() {
    return chakram.get(`${config.apiRoot}/reminders`).then(res => {
      expect(res).status(200);
      expect(res.body).deep.equal([]);
    });
  });
});
