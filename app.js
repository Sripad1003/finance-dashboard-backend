const express = require('express');
const ApiError = require('./utils/ApiError');
const errorHandler = require('./middleware/errorHandler');
const rateLimiter = require('./middleware/rateLimiter');

const app = express();

app.use(express.json({ limit: '1mb' }));
app.use(rateLimiter);

// Welcome route
app.get('/', (req, res) => {
  res.json({ success: true, message: 'Finance API Server is running! Please use /api for endpoints.' });
});

// Mount routes
const routes = require('./routes');
app.use('/api', routes);

// 404 catch-all
app.use((req, res, next) => {
  next(new ApiError(404, `Route ${req.method} ${req.path} not found`));
});

// Central error handler
app.use(errorHandler);

module.exports = app;
