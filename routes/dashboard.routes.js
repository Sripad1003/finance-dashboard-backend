const router = require('express').Router();
const dashboardController = require('../controllers/dashboard.controller');
const dashboardValidator = require('../validators/dashboard.validator');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');

router.use(authenticate);

// All authenticated users can view summary and recent activity
router.get('/summary', authorize(['Viewer', 'Analyst', 'Admin']), dashboardController.summary);
router.get('/recent-activity', authorize(['Viewer', 'Analyst', 'Admin']), validate(dashboardValidator.recentActivity), dashboardController.recentActivity);

// Analyst and Admin can view detailed analytics
router.get('/category-totals', authorize(['Analyst', 'Admin']), validate(dashboardValidator.categoryTotals), dashboardController.categoryTotals);
router.get('/monthly-trends', authorize(['Analyst', 'Admin']), validate(dashboardValidator.monthlyTrends), dashboardController.monthlyTrends);

module.exports = router;
