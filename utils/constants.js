module.exports = {
  ROLES: {
    VIEWER: 'Viewer',
    ANALYST: 'Analyst',
    ADMIN: 'Admin'
  },
  TRANSACTION_TYPES: ['income', 'expense'],
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  JWT_EXPIRY: '24h',
  CATEGORIES: [
    'salary', 'freelance', 'investment', 'dividends', 'bonus',
    'rent', 'food', 'utilities', 'transport', 'entertainment',
    'healthcare', 'education', 'shopping', 'travel', 'other'
  ]
};
