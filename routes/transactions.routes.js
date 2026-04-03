const router = require('express').Router();
const transactionsController = require('../controllers/transactions.controller');
const transactionsValidator = require('../validators/transactions.validator');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');

router.use(authenticate);

// Analyst and Admin can read
router.get('/', authorize(['Analyst', 'Admin']), validate(transactionsValidator.list), transactionsController.list);
router.get('/:id', authorize(['Analyst', 'Admin']), validate(transactionsValidator.getById), transactionsController.getById);

// Admin only can write
router.post('/', authorize(['Admin']), validate(transactionsValidator.create), transactionsController.create);
router.put('/:id', authorize(['Admin']), validate(transactionsValidator.update), transactionsController.update);
router.delete('/:id', authorize(['Admin']), validate(transactionsValidator.getById), transactionsController.remove);

module.exports = router;
