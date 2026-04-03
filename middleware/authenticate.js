const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../db/connection');
const ApiError = require('../utils/ApiError');

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new ApiError(401, 'Authentication required'));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwtSecret);

    const user = db.prepare(
      'SELECT id, username, email, role, is_active FROM users WHERE id = ? AND deleted_at IS NULL'
    ).get(decoded.id);

    if (!user) {
      return next(new ApiError(401, 'User not found'));
    }

    if (!user.is_active) {
      return next(new ApiError(401, 'Account is deactivated'));
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new ApiError(401, 'Token has expired'));
    }
    return next(new ApiError(401, 'Invalid token'));
  }
};

module.exports = authenticate;
