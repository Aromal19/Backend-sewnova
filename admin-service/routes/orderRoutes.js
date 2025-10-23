const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

// Order management routes - all require admin authentication
router.get('/', orderController.getAllOrders);
router.get('/statistics', orderController.getOrderStatistics);
router.get('/:id', orderController.getOrderById);
router.put('/:id/status', orderController.updateOrderStatus);

module.exports = router;
