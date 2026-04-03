const router = require('express').Router();

router.use('/auth', require('./auth.routes'));
router.use('/users', require('./users.routes'));
router.use('/transactions', require('./transactions.routes'));
router.use('/dashboard', require('./dashboard.routes'));

module.exports = router;
