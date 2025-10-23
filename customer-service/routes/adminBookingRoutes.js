const express = require('express');
const router = express.Router();
const { 
  getAllBookings,
  getBookingById,
  updateBookingStatus,
  getBookingStatistics
} = require('../controllers/adminBookingController');

// Admin booking routes - NO authentication required for admin access
router.get('/', getAllBookings);
router.get('/statistics', getBookingStatistics);
router.get('/:id', getBookingById);
router.put('/:id/status', updateBookingStatus);

module.exports = router;
