const { InvalidInputError } = require('./errors');

module.exports = {
  checkPropertyType(obj, prop, type) {
    if (obj[prop] == null || typeof obj[prop] !== type) {
      throw new InvalidInputError(
        'invalid_type', `"${prop}" should be a ${type}`
      );
    }
  }
};
