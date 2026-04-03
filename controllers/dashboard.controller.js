const dashboardService = require('../services/dashboard.service');
const { successResponse } = require('../utils/response');

exports.summary = (req, res, next) => {
  try {
    const data = dashboardService.getSummary();
    successResponse(res, data);
  } catch (err) {
    next(err);
  }
};

exports.categoryTotals = (req, res, next) => {
  try {
    const { type } = req.query;
    const data = dashboardService.getCategoryTotals(type);
    successResponse(res, data);
  } catch (err) {
    next(err);
  }
};

exports.monthlyTrends = (req, res, next) => {
  try {
    const { year } = req.query;
    const data = dashboardService.getMonthlyTrends(year);
    successResponse(res, data);
  } catch (err) {
    next(err);
  }
};

exports.recentActivity = (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const data = dashboardService.getRecentActivity(limit);
    successResponse(res, data);
  } catch (err) {
    next(err);
  }
};
