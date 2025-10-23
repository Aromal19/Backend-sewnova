const express = require('express');
const router = express.Router();
const { 
  getAllOrdersForAdmin,
  getOrderByIdForAdmin,
  updateOrderStatusForAdmin,
  getOrderStatisticsForAdmin,
  getAllBookingsForAdmin,
  getBookingByIdForAdmin,
  updateBookingStatusForAdmin,
  getBookingStatisticsForAdmin
} = require('../controllers/orderController');

// Admin order routes - all require admin authentication
router.get('/', getAllOrdersForAdmin);
router.get('/statistics', getOrderStatisticsForAdmin);

// Admin booking routes - MUST come before parameterized routes
router.get('/bookings/all', getAllBookingsForAdmin);
router.get('/bookings/statistics', getBookingStatisticsForAdmin);
router.get('/bookings/:id', getBookingByIdForAdmin);
router.put('/bookings/:id/status', updateBookingStatusForAdmin);

// Parameterized routes - MUST come after specific routes
router.get('/:id', getOrderByIdForAdmin);
router.put('/:id/status', updateOrderStatusForAdmin);

module.exports = router;

