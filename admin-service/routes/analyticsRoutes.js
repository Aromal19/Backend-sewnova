const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');

// Analytics routes
router.get('/', analyticsController.getAnalytics);
router.get('/revenue', analyticsController.getRevenueAnalytics);
router.get('/users', analyticsController.getUserAnalytics);

module.exports = router;
