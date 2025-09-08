const express = require('express');
const router = express.Router();
const {
  getCustomerProfile,
  updateCustomerProfile,
  getCustomerPreferences,
  updateCustomerPreferences,
  getCustomerDashboard,
  getCustomerStats
} = require('../controllers/customerController');

// Get customer profile
router.get('/profile', getCustomerProfile);

// Update customer profile
router.put('/profile', updateCustomerProfile);

// Get customer preferences
router.get('/preferences', getCustomerPreferences);

// Update customer preferences
router.put('/preferences', updateCustomerPreferences);

// Get customer dashboard data
router.get('/dashboard', getCustomerDashboard);

// Get customer statistics
router.get('/stats', getCustomerStats);

module.exports = router; 