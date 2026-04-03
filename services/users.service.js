const bcrypt = require('bcryptjs');
const db = require('../db/connection');
const config = require('../config');
const ApiError = require('../utils/ApiError');

exports.list = ({ role, is_active, page = 1, limit = 20 }) => {
  const conditions = ['deleted_at IS NULL'];
  const params = [];

  if (role) {
    conditions.push('role = ?');
    params.push(role);
  }
  if (is_active !== undefined && is_active !== null) {
    conditions.push('is_active = ?');
    params.push(is_active);
  }

  const where = conditions.join(' AND ');
  const offset = (page - 1) * limit;

  const { total } = db.prepare(
    `SELECT COUNT(*) as total FROM users WHERE ${where}`
  ).get(...params);

  const users = db.prepare(
    `SELECT id, username, email, role, is_active, created_at, updated_at
     FROM users WHERE ${where}
     ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).all(...params, limit, offset);

  return { users, total, page, limit };
};

exports.getById = (id) => {
  const user = db.prepare(
    'SELECT id, username, email, role, is_active, created_at, updated_at FROM users WHERE id = ? AND deleted_at IS NULL'
  ).get(id);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }
  return user;
};

exports.create = ({ username, email, password, role }) => {
  const existing = db.prepare(
    'SELECT id FROM users WHERE (email = ? OR username = ?) AND deleted_at IS NULL'
  ).get(email, username);

  if (existing) {
    throw new ApiError(409, 'User with this email or username already exists');
  }

  const hashedPassword = bcrypt.hashSync(password, config.bcryptRounds);

  const result = db.prepare(
    'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)'
  ).run(username, email, hashedPassword, role || 'Viewer');

  return db.prepare(
    'SELECT id, username, email, role, is_active, created_at FROM users WHERE id = ?'
  ).get(result.lastInsertRowid);
};

exports.update = (id, data) => {
  const user = exports.getById(id);

  const fields = [];
  const params = [];

  if (data.username !== undefined) {
    const dup = db.prepare(
      'SELECT id FROM users WHERE username = ? AND id != ? AND deleted_at IS NULL'
    ).get(data.username, id);
    if (dup) throw new ApiError(409, 'Username already taken');
    fields.push('username = ?');
    params.push(data.username);
  }
  if (data.email !== undefined) {
    const dup = db.prepare(
      'SELECT id FROM users WHERE email = ? AND id != ? AND deleted_at IS NULL'
    ).get(data.email, id);
    if (dup) throw new ApiError(409, 'Email already taken');
    fields.push('email = ?');
    params.push(data.email);
  }
  if (data.role !== undefined) {
    fields.push('role = ?');
    params.push(data.role);
  }
  if (data.is_active !== undefined) {
    fields.push('is_active = ?');
    params.push(data.is_active);
  }
  if (data.password !== undefined) {
    fields.push('password = ?');
    params.push(bcrypt.hashSync(data.password, config.bcryptRounds));
  }

  if (fields.length === 0) {
    return user;
  }

  fields.push("updated_at = datetime('now')");
  params.push(id);

  db.prepare(
    `UPDATE users SET ${fields.join(', ')} WHERE id = ?`
  ).run(...params);

  return exports.getById(id);
};

exports.toggleStatus = (id, is_active) => {
  exports.getById(id); // throws 404 if not found

  db.prepare(
    "UPDATE users SET is_active = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(is_active, id);

  return exports.getById(id);
};

exports.softDelete = (id) => {
  exports.getById(id); // throws 404 if not found

  db.prepare(
    "UPDATE users SET deleted_at = datetime('now'), updated_at = datetime('now') WHERE id = ?"
  ).run(id);
};
