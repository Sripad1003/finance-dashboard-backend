const config = require('../config');
const ApiError = require('../utils/ApiError');

const requests = new Map();

const rateLimiter = (req, res, next) => {
  const ip = req.ip;
  const now = Date.now();
  const windowMs = config.rateLimit.windowMs;
  const max = config.rateLimit.max;

  if (!requests.has(ip)) {
    requests.set(ip, []);
  }

  const timestamps = requests.get(ip).filter(t => now - t < windowMs);
  timestamps.push(now);
  requests.set(ip, timestamps);

  if (timestamps.length > max) {
    return next(new ApiError(429, 'Too many requests, please try again later'));
  }

  next();
};

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, timestamps] of requests) {
    const filtered = timestamps.filter(t => now - t < 60000);
    if (filtered.length === 0) {
      requests.delete(ip);
    } else {
      requests.set(ip, filtered);
    }
  }
}, 300000).unref();

module.exports = rateLimiter;
