const { body, query, param } = require('express-validator');

exports.list = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
  query('type').optional().isIn(['income', 'expense']).withMessage('Type must be income or expense'),
  query('category').optional().isString().trim().notEmpty().withMessage('Category cannot be empty'),
  query('startDate').optional().isISO8601().withMessage('startDate must be a valid date (YYYY-MM-DD)'),
  query('endDate').optional().isISO8601().withMessage('endDate must be a valid date (YYYY-MM-DD)'),
  query('sortBy').optional().isIn(['date', 'amount', 'created_at', 'category', 'type']).withMessage('Invalid sort field'),
  query('order').optional().isIn(['asc', 'desc']).withMessage('Order must be asc or desc')
];

exports.getById = [
  param('id').isInt({ min: 1 }).withMessage('Invalid transaction ID')
];

exports.create = [
  body('amount')
    .isFloat({ gt: 0 }).withMessage('Amount must be a positive number'),
  body('type')
    .isIn(['income', 'expense']).withMessage('Type must be income or expense'),
  body('category')
    .trim()
    .notEmpty().withMessage('Category is required')
    .isLength({ max: 50 }).withMessage('Category must be under 50 characters'),
  body('date')
    .isISO8601().withMessage('Date must be a valid date (YYYY-MM-DD)'),
  body('notes')
    .optional({ values: 'null' })
    .isString()
    .isLength({ max: 500 }).withMessage('Notes must be under 500 characters')
];

exports.update = [
  param('id').isInt({ min: 1 }).withMessage('Invalid transaction ID'),
  body('amount')
    .optional()
    .isFloat({ gt: 0 }).withMessage('Amount must be a positive number'),
  body('type')
    .optional()
    .isIn(['income', 'expense']).withMessage('Type must be income or expense'),
  body('category')
    .optional()
    .trim()
    .notEmpty().withMessage('Category cannot be empty')
    .isLength({ max: 50 }).withMessage('Category must be under 50 characters'),
  body('date')
    .optional()
    .isISO8601().withMessage('Date must be a valid date (YYYY-MM-DD)'),
  body('notes')
    .optional({ values: 'null' })
    .isString()
    .isLength({ max: 500 }).withMessage('Notes must be under 500 characters')
];
