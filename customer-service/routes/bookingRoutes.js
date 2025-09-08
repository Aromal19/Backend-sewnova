const express = require('express');
const router = express.Router();
const {
  getCustomerBookings,
  getBookingById,
  createBooking,
  updateBooking,
  cancelBooking,
  updateBookingStatus,
  completeBooking,
  updatePaymentStatus,
  addBookingReview
} = require('../controllers/bookingController');

// Get all bookings for the authenticated customer
router.get('/', getCustomerBookings);

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

module.exports = router; 