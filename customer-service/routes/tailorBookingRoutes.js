const express = require('express');
const router = express.Router();
const {
  getTailorOrders,
  getActiveOrders,
  getOrderById,
  updateOrderStatus,
  addOrderMessage,
  getOrderStatistics
} = require('../controllers/tailorBookingController');

// All routes require tailor authentication
// The auth middleware should be applied in the main app.js/server.js

/**
 * @route   GET /api/tailor/orders
 * @desc    Get all orders for tailor
 * @access  Private (Tailor)
 */
router.get('/orders', getTailorOrders);

/**
 * @route   GET /api/tailor/orders/active
 * @desc    Get active orders for tailor
 * @access  Private (Tailor)
 */
router.get('/orders/active', getActiveOrders);

/**
 * @route   GET /api/tailor/orders/statistics
 * @desc    Get order statistics for tailor
 * @access  Private (Tailor)
 */
router.get('/orders/statistics', getOrderStatistics);

/**
 * @route   GET /api/tailor/orders/:id
 * @desc    Get specific order by ID
 * @access  Private (Tailor)
 */
router.get('/orders/:id', getOrderById);

/**
 * @route   PUT /api/tailor/orders/:id/status
 * @desc    Update order status
 * @access  Private (Tailor)
 */
router.put('/orders/:id/status', updateOrderStatus);

/**
 * @route   POST /api/tailor/orders/:id/messages
 * @desc    Add message/note to order
 * @access  Private (Tailor)
 */
router.post('/orders/:id/messages', addOrderMessage);

module.exports = router;

