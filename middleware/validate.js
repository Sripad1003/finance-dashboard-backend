const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

const validate = (validations) => async (req, res, next) => {
  for (const validation of validations) {
    await validation.run(req);
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const details = errors.array().map(e => ({ field: e.path, message: e.msg }));
    return next(new ApiError(400, 'Validation failed', details));
  }
  next();
};

module.exports = validate;
