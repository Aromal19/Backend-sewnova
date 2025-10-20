const express = require('express');
const router = express.Router();
const { 
  createOrderFromBooking
} = require('../controllers/orderController');

// Create order from booking (called by payment service - no auth required)
router.post('/create-from-booking', createOrderFromBooking);

module.exports = router;
