const { InvalidInputError } = require('./errors');

module.exports = {
  checkPropertyType(obj, prop, type) {
    if (obj[prop] == null || typeof obj[prop] !== type) {
      throw new InvalidInputError(
        'invalid_type', `"${prop}" should be a ${type}`
      );
    }
  },

  checkIsArray(obj, prop, minLength = 0) {
    if (!Array.isArray(obj[prop])) {
      throw new InvalidInputError(
        'invalid_type', `"${prop}" should be an array`
      );
    }

    if (obj[prop].length < minLength) {
      throw new InvalidInputError(
        'invalid_type', `"${prop}" should have at least ${minLength} elements`
      );
    }
  }
};
