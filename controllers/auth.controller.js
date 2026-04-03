const authService = require('../services/auth.service');
const { successResponse, createdResponse } = require('../utils/response');

exports.register = (req, res, next) => {
  try {
    const { username, email, password } = req.body;
    const data = authService.register(username, email, password);
    createdResponse(res, data);
  } catch (err) {
    next(err);
  }
};

exports.login = (req, res, next) => {
  try {
    const { email, password } = req.body;
    const data = authService.login(email, password);
    successResponse(res, data);
  } catch (err) {
    next(err);
  }
};
