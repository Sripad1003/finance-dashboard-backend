const db = require('../db/connection');
const ApiError = require('../utils/ApiError');

exports.list = ({ type, category, startDate, endDate, sortBy = 'date', order = 'desc', page = 1, limit = 20 }) => {
  const conditions = ['deleted_at IS NULL'];
  const params = [];

  if (type) {
    conditions.push('type = ?');
    params.push(type);
  }
  if (category) {
    conditions.push('category = ?');
    params.push(category);
  }
  if (startDate) {
    conditions.push('date >= ?');
    params.push(startDate);
  }
  if (endDate) {
    conditions.push('date <= ?');
    params.push(endDate);
  }

  const allowedSorts = ['date', 'amount', 'created_at', 'category', 'type'];
  const safeSort = allowedSorts.includes(sortBy) ? sortBy : 'date';
  const safeOrder = order === 'asc' ? 'ASC' : 'DESC';

  const where = conditions.join(' AND ');
  const offset = (page - 1) * limit;

  const { total } = db.prepare(
    `SELECT COUNT(*) as total FROM transactions WHERE ${where}`
  ).get(...params);

  const transactions = db.prepare(
    `SELECT id, user_id, amount, type, category, date, notes, created_at, updated_at
     FROM transactions WHERE ${where}
     ORDER BY ${safeSort} ${safeOrder} LIMIT ? OFFSET ?`
  ).all(...params, limit, offset);

  return { transactions, total, page, limit };
};

exports.getById = (id) => {
  const txn = db.prepare(
    'SELECT id, user_id, amount, type, category, date, notes, created_at, updated_at FROM transactions WHERE id = ? AND deleted_at IS NULL'
  ).get(id);

  if (!txn) {
    throw new ApiError(404, 'Transaction not found');
  }
  return txn;
};

exports.create = (userId, { amount, type, category, date, notes }) => {
  const result = db.prepare(
    'INSERT INTO transactions (user_id, amount, type, category, date, notes) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(userId, amount, type, category, date, notes || null);

  return exports.getById(result.lastInsertRowid);
};

exports.update = (id, data) => {
  exports.getById(id); // throws 404 if not found

  const fields = [];
  const params = [];

  if (data.amount !== undefined) {
    fields.push('amount = ?');
    params.push(data.amount);
  }
  if (data.type !== undefined) {
    fields.push('type = ?');
    params.push(data.type);
  }
  if (data.category !== undefined) {
    fields.push('category = ?');
    params.push(data.category);
  }
  if (data.date !== undefined) {
    fields.push('date = ?');
    params.push(data.date);
  }
  if (data.notes !== undefined) {
    fields.push('notes = ?');
    params.push(data.notes);
  }

  if (fields.length === 0) {
    return exports.getById(id);
  }

  fields.push("updated_at = datetime('now')");
  params.push(id);

  db.prepare(
    `UPDATE transactions SET ${fields.join(', ')} WHERE id = ?`
  ).run(...params);

  return exports.getById(id);
};

exports.softDelete = (id) => {
  exports.getById(id); // throws 404 if not found

  db.prepare(
    "UPDATE transactions SET deleted_at = datetime('now'), updated_at = datetime('now') WHERE id = ?"
  ).run(id);
};
