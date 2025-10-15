const express = require('express');
const router = express.Router();
const addressController = require('../controllers/addressController');
const authMiddleware = require('../middleware/authMiddleware');

// Apply authentication middleware to all routes
router.use(authMiddleware.authMiddleware, authMiddleware.customerOnly);

// Create a new address
router.post('/', addressController.createAddress);

// Get all addresses for the current customer
router.get('/', addressController.getAddresses);

// Get default address for the current customer
router.get('/default', addressController.getDefaultAddress);

// Update an address by id
router.put('/:id', addressController.updateAddress);

// Delete an address by id
router.delete('/:id', addressController.deleteAddress);

module.exports = router; 