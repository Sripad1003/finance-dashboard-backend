const usersService = require('../services/users.service');
const { successResponse, createdResponse } = require('../utils/response');

exports.list = (req, res, next) => {
  try {
    const { role, is_active, page, limit } = req.query;
    const result = usersService.list({
      role,
      is_active: is_active !== undefined ? parseInt(is_active) : undefined,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20
    });
    successResponse(res, {
      users: result.users,
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

exports.getMe = (req, res, next) => {
  try {
    const user = usersService.getById(req.user.id);
    successResponse(res, user);
  } catch (err) {
    next(err);
  }
};

exports.getById = (req, res, next) => {
  try {
    const user = usersService.getById(parseInt(req.params.id));
    successResponse(res, user);
  } catch (err) {
    next(err);
  }
};

exports.create = (req, res, next) => {
  try {
    const { username, email, password, role } = req.body;
    const user = usersService.create({ username, email, password, role });
    createdResponse(res, user);
  } catch (err) {
    next(err);
  }
};

exports.update = (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const user = usersService.update(id, req.body);
    successResponse(res, user);
  } catch (err) {
    next(err);
  }
};

exports.toggleStatus = (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const { is_active } = req.body;
    const user = usersService.toggleStatus(id, is_active);
    successResponse(res, user);
  } catch (err) {
    next(err);
  }
};

exports.remove = (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    usersService.softDelete(id);
    successResponse(res, { message: 'User deleted successfully' });
  } catch (err) {
    next(err);
  }
};
