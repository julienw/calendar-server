function UnauthorizedError(code, message) {
  this.code = code;
  this.message = message;
  this.status = 401;
  this.name = 'UnauthorizedError';
  Error.captureStackTrace(this);
}

UnauthorizedError.prototype = Object.create(Error.prototype);

function InvalidInputError(code, message) {
  this.code = code;
  this.message = message;
  this.status = 400;
  this.name = 'InvalidInputError';
  Error.captureStackTrace(this);
}

InvalidInputError.prototype = Object.create(Error.prototype);

module.exports = {
  InvalidInputError,
  UnauthorizedError,
};
