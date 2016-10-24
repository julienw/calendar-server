const debug = require('debug')('calendar-server:business/twilio');

const request = require('request');
const config = require('../config');

// eslint-disable-next-line max-len
const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${config.twilioAccountSID}/Messages.json`;

function sendSmsViaTwilio(number, message) {
  debug('sendSmsViaTwilio(number=%s, message=%s)', number, message);

  if (!number.startsWith('+')) {
    if (number.length === 10) {
      number = `1${number}`;
    }
    if (number.length === 11) {
      number = `+${number}`;
    }
  }

  return new Promise((resolve, reject) => {
    request.post(twilioUrl, {
      auth: { user: config.twilioAccountSID, pass: config.twilioAuthToken },
      form: { To: number, From: config.twilioPhoneNumber, Body: message }
    }, (err, res, _body) => {
      if (!err && res.statusCode < 300) {
        resolve();
      } else {
        reject(err || new Error(`Unsuccessful status ${res.statusCode}`));
      }
    });
  });
}

module.exports = sendSmsViaTwilio;
