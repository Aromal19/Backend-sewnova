const express = require('express');
const router = express.Router();
const {
  createBooking
} = require('../controllers/bookingController');

// Test route
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Payment booking route is working' });
});

// Create booking (called by payment service - no auth required)
router.post('/', createBooking);

module.exports = router;
