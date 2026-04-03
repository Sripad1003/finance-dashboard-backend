const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/connection');
const config = require('../config');
const ApiError = require('../utils/ApiError');

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    config.jwtSecret,
    { expiresIn: config.jwtExpiry }
  );
}

exports.register = (username, email, password) => {
  const existing = db.prepare(
    'SELECT id FROM users WHERE (email = ? OR username = ?) AND deleted_at IS NULL'
  ).get(email, username);

  if (existing) {
    throw new ApiError(409, 'User with this email or username already exists');
  }

  const hashedPassword = bcrypt.hashSync(password, config.bcryptRounds);

  const result = db.prepare(
    'INSERT INTO users (username, email, password) VALUES (?, ?, ?)'
  ).run(username, email, hashedPassword);

  const user = db.prepare(
    'SELECT id, username, email, role, is_active, created_at FROM users WHERE id = ?'
  ).get(result.lastInsertRowid);

  const token = generateToken(user);

  return { ...user, token };
};

exports.login = (email, password) => {
  const user = db.prepare(
    'SELECT * FROM users WHERE email = ? AND deleted_at IS NULL'
  ).get(email);

  if (!user) {
    throw new ApiError(401, 'Invalid email or password');
  }

  if (!user.is_active) {
    throw new ApiError(401, 'Account is deactivated');
  }

  const isMatch = bcrypt.compareSync(password, user.password);
  if (!isMatch) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const token = generateToken(user);

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    token
  };
};
