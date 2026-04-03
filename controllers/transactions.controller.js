const transactionsService = require('../services/transactions.service');
const { successResponse, createdResponse } = require('../utils/response');

exports.list = (req, res, next) => {
  try {
    const { type, category, startDate, endDate, sortBy, order, page, limit } = req.query;
    const result = transactionsService.list({
      type, category, startDate, endDate, sortBy, order,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20
    });
    successResponse(res, {
      transactions: result.transactions,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / result.limit)
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.getById = (req, res, next) => {
  try {
    const txn = transactionsService.getById(parseInt(req.params.id));
    successResponse(res, txn);
  } catch (err) {
    next(err);
  }
};

exports.create = (req, res, next) => {
  try {
    const { amount, type, category, date, notes } = req.body;
    const txn = transactionsService.create(req.user.id, { amount, type, category, date, notes });
    createdResponse(res, txn);
  } catch (err) {
    next(err);
  }
};

exports.update = (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const txn = transactionsService.update(id, req.body);
    successResponse(res, txn);
  } catch (err) {
    next(err);
  }
};

exports.remove = (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    transactionsService.softDelete(id);
    successResponse(res, { message: 'Transaction deleted successfully' });
  } catch (err) {
    next(err);
  }
};
