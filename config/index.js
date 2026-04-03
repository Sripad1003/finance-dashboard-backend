require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  jwtSecret: process.env.JWT_SECRET || 'default-dev-secret-change-me',
  jwtExpiry: process.env.JWT_EXPIRY || '24h',
  dbPath: process.env.DB_PATH || 'data.db',
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 10,
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
    max: parseInt(process.env.RATE_LIMIT_MAX) || 100
  }
};
