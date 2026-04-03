const db = require('../db/connection');

exports.getSummary = () => {
  const row = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS totalIncome,
      COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS totalExpenses,
      COUNT(*) AS transactionCount
    FROM transactions
    WHERE deleted_at IS NULL
  `).get();

  return {
    totalIncome: row.totalIncome,
    totalExpenses: row.totalExpenses,
    netBalance: row.totalIncome - row.totalExpenses,
    transactionCount: row.transactionCount
  };
};

exports.getCategoryTotals = (type) => {
  const conditions = ['deleted_at IS NULL'];
  const params = [];

  if (type) {
    conditions.push('type = ?');
    params.push(type);
  }

  return db.prepare(`
    SELECT category, SUM(amount) AS total, COUNT(*) AS count
    FROM transactions
    WHERE ${conditions.join(' AND ')}
    GROUP BY category
    ORDER BY total DESC
  `).all(...params);
};

exports.getMonthlyTrends = (year) => {
  const conditions = ['deleted_at IS NULL'];
  const params = [];

  if (year) {
    conditions.push("strftime('%Y', date) = ?");
    params.push(String(year));
  }

  return db.prepare(`
    SELECT
      strftime('%Y-%m', date) AS month,
      COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS income,
      COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS expense
    FROM transactions
    WHERE ${conditions.join(' AND ')}
    GROUP BY month
    ORDER BY month ASC
  `).all(...params).map(row => ({
    ...row,
    net: row.income - row.expense
  }));
};

exports.getRecentActivity = (limit = 10) => {
  return db.prepare(`
    SELECT id, amount, type, category, date, notes, created_at
    FROM transactions
    WHERE deleted_at IS NULL
    ORDER BY date DESC, created_at DESC
    LIMIT ?
  `).all(limit);
};
