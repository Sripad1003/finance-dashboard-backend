const { body, query, param } = require('express-validator');

exports.list = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
  query('role').optional().isIn(['Viewer', 'Analyst', 'Admin']).withMessage('Invalid role'),
  query('is_active').optional().isIn(['0', '1']).withMessage('is_active must be 0 or 1')
];

exports.getById = [
  param('id').isInt({ min: 1 }).withMessage('Invalid user ID')
];

exports.create = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 }).withMessage('Username must be 3-30 characters')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .isEmail().withMessage('Must be a valid email address')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8, max: 128 }).withMessage('Password must be 8-128 characters')
    .matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain uppercase, lowercase, and a number'),
  body('role')
    .optional()
    .isIn(['Viewer', 'Analyst', 'Admin']).withMessage('Role must be Viewer, Analyst, or Admin')
];

exports.update = [
  param('id').isInt({ min: 1 }).withMessage('Invalid user ID'),
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 30 }).withMessage('Username must be 3-30 characters')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .optional()
    .isEmail().withMessage('Must be a valid email address')
    .normalizeEmail(),
  body('role')
    .optional()
    .isIn(['Viewer', 'Analyst', 'Admin']).withMessage('Role must be Viewer, Analyst, or Admin'),
  body('is_active')
    .optional()
    .isIn([0, 1]).withMessage('is_active must be 0 or 1'),
  body('password')
    .optional()
    .isLength({ min: 8, max: 128 }).withMessage('Password must be 8-128 characters')
    .matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain uppercase, lowercase, and a number')
];

exports.toggleStatus = [
  param('id').isInt({ min: 1 }).withMessage('Invalid user ID'),
  body('is_active')
    .isIn([0, 1]).withMessage('is_active must be 0 or 1')
];
