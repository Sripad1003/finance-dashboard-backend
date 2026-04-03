const { query } = require('express-validator');

exports.categoryTotals = [
  query('type').optional().isIn(['income', 'expense']).withMessage('Type must be income or expense')
];

exports.monthlyTrends = [
  query('year').optional().isInt({ min: 2000, max: 2100 }).withMessage('Year must be a valid year')
];

exports.recentActivity = [
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be 1-50')
];
