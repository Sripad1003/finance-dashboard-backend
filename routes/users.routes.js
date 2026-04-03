const router = require('express').Router();
const usersController = require('../controllers/users.controller');
const usersValidator = require('../validators/users.validator');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');

// All routes require authentication
router.use(authenticate);

// Any authenticated user can view their own profile
router.get('/me', usersController.getMe);

// Admin-only routes
router.get('/', authorize(['Admin']), validate(usersValidator.list), usersController.list);
router.get('/:id', authorize(['Admin']), validate(usersValidator.getById), usersController.getById);
router.post('/', authorize(['Admin']), validate(usersValidator.create), usersController.create);
router.put('/:id', authorize(['Admin']), validate(usersValidator.update), usersController.update);
router.patch('/:id/status', authorize(['Admin']), validate(usersValidator.toggleStatus), usersController.toggleStatus);
router.delete('/:id', authorize(['Admin']), validate(usersValidator.getById), usersController.remove);

module.exports = router;
