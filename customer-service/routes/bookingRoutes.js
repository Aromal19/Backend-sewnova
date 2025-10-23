const express = require('express');
const router = express.Router();
const {
  getCustomerBookings,
  getCustomerOrders,
  getBookingById,
  createBooking,
  updateBooking,
  cancelBooking,
  updateBookingStatus,
  completeBooking,
  updatePaymentStatus,
  addBookingReview,
  handlePaymentSuccess,
  createSampleBooking,
  debugDatabase,
  testAPI
} = require('../controllers/bookingController');

// Get all bookings for the authenticated customer
router.get('/', getCustomerBookings);

// Get customer orders (enhanced version for orders page)
router.get('/orders', getCustomerOrders);

// Get a specific booking by ID
router.get('/:id', getBookingById);

// Create a new booking
router.post('/', createBooking);

// Update a booking
router.put('/:id', updateBooking);

// Cancel a booking
router.patch('/:id/cancel', cancelBooking);

// Update booking status
router.patch('/:id/status', updateBookingStatus);

// Complete a booking
router.patch('/:id/complete', completeBooking);

// Update payment status
router.patch('/:id/payment', updatePaymentStatus);

// Add review to booking
router.post('/:id/review', addBookingReview);

// Debug routes
router.get('/test', testAPI); // No authentication required
router.get('/debug/database', debugDatabase);
router.post('/debug/sample', createSampleBooking);

// Note: Payment success route moved to server.js to avoid authentication requirement

module.exports = router; 